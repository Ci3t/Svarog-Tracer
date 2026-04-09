export const TITLE_DEFINITIONS = [
  {
    key: 'astral-marshal',
    name: 'Astral Marshal',
    requirement: 'Finish #1 on the season leaderboard.',
    rarity: 'mythic',
    category: 'ranked',
  },
  {
    key: 'proxy-prime',
    name: 'Proxy Prime',
    requirement: 'Finish top 3 on the season leaderboard.',
    rarity: 'legendary',
    category: 'ranked',
  },
  {
    key: 'leyline-tactician',
    name: 'Leyline Tactician',
    requirement: 'Finish top 10 on the season leaderboard.',
    rarity: 'rare',
    category: 'ranked',
  },
  {
    key: 'ranked-riftwalker',
    name: 'Rift Duelist',
    requirement: 'Win 5 competitive rooms.',
    rarity: 'rare',
    category: 'ranked',
  },
  {
    key: 'resonium-savant',
    name: 'Resonium Savant',
    requirement: 'Reach a 90+ competitive score.',
    rarity: 'epic',
    category: 'performance',
  },
  {
    key: 'svarog-calibrated',
    name: 'Svarog-Calibrated',
    requirement: 'Win 8 bot rooms.',
    rarity: 'epic',
    category: 'svarog',
  },
  {
    key: 'signal-initiate',
    name: 'Signal Initiate',
    requirement: 'Clear your first handcrafted challenge.',
    rarity: 'common',
    category: 'solver',
  },
  {
    key: 'hollow-cartographer',
    name: 'Hollow Cartographer',
    requirement: 'Clear 5 handcrafted challenges.',
    rarity: 'rare',
    category: 'solver',
  },
  {
    key: 'tracer-sovereign',
    name: 'Tracer Sovereign',
    requirement: 'Clear 10 handcrafted challenges.',
    rarity: 'legendary',
    category: 'svarog',
  },
  {
    key: 'stellar-overclock',
    name: 'Stellar Overclock',
    requirement: 'Purchased from the market.',
    rarity: 'epic',
    category: 'market',
  },
  {
    key: 'ghost-protocol',
    name: 'Ghost Protocol',
    requirement: 'Purchased from the market.',
    rarity: 'legendary',
    category: 'market',
  },
  {
    key: 'zero-day-oracle',
    name: 'Zero-Day Oracle',
    requirement: 'Purchased from the market.',
    rarity: 'mythic',
    category: 'market',
  },
  {
    key: 'tracer-paragon',
    name: 'Tracer Paragon',
    requirement: 'Purchased from the market.',
    rarity: 'mythic',
    category: 'market',
  },
  {
    key: 'hollow-singularity',
    name: 'Hollow Singularity',
    requirement: 'Purchased from the market.',
    rarity: 'mythic',
    category: 'market',
  },
  {
    key: 'aeon-splitter',
    name: 'Aeon Splitter',
    requirement: 'Purchased from the market.',
    rarity: 'legendary',
    category: 'market',
  },
  {
    key: 'signal-wraith',
    name: 'Signal Wraith',
    requirement: 'Purchased from the market.',
    rarity: 'epic',
    category: 'market',
  },
  {
    key: 'starrail-operator',
    name: 'Starrail Operator',
    requirement: 'Purchased from the market.',
    rarity: 'rare',
    category: 'market',
  },
  {
    key: 'forge-calibrator',
    name: 'Forge Calibrator',
    requirement: 'Max three relics in free training.',
    rarity: 'epic',
    category: 'training',
  },
  {
    key: 'drill-ace',
    name: 'Drill Ace',
    requirement: 'Clear the drills sequence once.',
    rarity: 'rare',
    category: 'training',
  },
  {
    key: 'lab-archivist',
    name: 'Lab Archivist',
    requirement: 'Complete five pattern lab analyses.',
    rarity: 'epic',
    category: 'analysis',
  },
  {
    key: 'night-shift-operator',
    name: 'Night Shift Operator',
    requirement: 'Reach level 8.',
    rarity: 'epic',
    category: 'level',
  },
  {
    key: 'trace-architect',
    name: 'Trace Architect',
    requirement: 'Reach level 16.',
    rarity: 'legendary',
    category: 'level',
  },
];

export const RANK_TIER_DEFINITIONS = [
  {
    key: 'unranked',
    name: 'Unranked',
    shortName: 'Unranked',
    minPoints: 0,
    color: '#8b93a7',
    accent: 'rgba(139, 147, 167, 0.18)',
  },
  {
    key: 'signal-bronze',
    name: 'Signal Bronze',
    shortName: 'Bronze',
    minPoints: 1,
    color: '#c98a56',
    accent: 'rgba(201, 138, 86, 0.16)',
  },
  {
    key: 'rift-silver',
    name: 'Rift Silver',
    shortName: 'Silver',
    minPoints: 10,
    color: '#c3d0e5',
    accent: 'rgba(195, 208, 229, 0.16)',
  },
  {
    key: 'astral-gold',
    name: 'Astral Gold',
    shortName: 'Gold',
    minPoints: 20,
    color: '#f1c76a',
    accent: 'rgba(241, 199, 106, 0.16)',
  },
  {
    key: 'void-prism',
    name: 'Void Prism',
    shortName: 'Prism',
    minPoints: 35,
    color: '#b388ff',
    accent: 'rgba(179, 136, 255, 0.18)',
  },
  {
    key: 'tracer-myth',
    name: 'Tracer Myth',
    shortName: 'Myth',
    minPoints: 55,
    color: '#ff6b9f',
    accent: 'rgba(255, 107, 159, 0.18)',
  },
];

export const REWARD_DEFINITIONS = [
  {
    key: 'signal-frame',
    name: 'Signal Frame',
    requirement: 'Reach Signal Bronze.',
    rarity: 'common',
    unlockType: 'rankTier',
    unlockValue: 'signal-bronze',
    rewardType: 'frame',
  },
  {
    key: 'rift-ops-mark',
    name: 'Rift Ops Mark',
    requirement: 'Win 3 competitive rooms.',
    rarity: 'rare',
    unlockType: 'competitiveWins',
    unlockValue: 3,
    rewardType: 'badge',
  },
  {
    key: 'clara-chip-cache',
    name: 'Clara Chip Cache',
    requirement: 'Win 7 competitive rooms.',
    rarity: 'rare',
    unlockType: 'competitiveWins',
    unlockValue: 7,
    rewardType: 'currency',
    grantTokens: 320,
  },
  {
    key: 'solver-sigil',
    name: 'Solver Sigil',
    requirement: 'Clear 5 handcrafted challenges.',
    rarity: 'epic',
    unlockType: 'solvedChallengeCount',
    unlockValue: 5,
    rewardType: 'badge',
  },
  {
    key: 'prism-nameplate',
    name: 'Prism Nameplate',
    requirement: 'Reach Void Prism.',
    rarity: 'legendary',
    unlockType: 'rankTier',
    unlockValue: 'void-prism',
    rewardType: 'nameplate',
  },
  {
    key: 'season-crown-cache',
    name: 'Season Crown Cache',
    requirement: 'Finish top 3 this season.',
    rarity: 'mythic',
    unlockType: 'leaderboardTop',
    unlockValue: 3,
    rewardType: 'seasonal',
    grantTokens: 900,
  },
  {
    key: 'training-chip-cache',
    name: 'Training Chip Cache',
    requirement: 'Log 3 free training sessions.',
    rarity: 'rare',
    unlockType: 'freeTrainingSessions',
    unlockValue: 3,
    rewardType: 'currency',
    grantTokens: 240,
  },
  {
    key: 'drill-frame',
    name: 'Drill Frame',
    requirement: 'Clear the drills sequence once.',
    rarity: 'rare',
    unlockType: 'drillsClears',
    unlockValue: 1,
    rewardType: 'frame',
  },
  {
    key: 'analysis-banner',
    name: 'Analysis Banner',
    requirement: 'Complete 5 pattern lab analyses.',
    rarity: 'epic',
    unlockType: 'patternLabAnalyses',
    unlockValue: 5,
    rewardType: 'nameplate',
  },
  {
    key: 'relay-chip-cache',
    name: 'Relay Chip Cache',
    requirement: 'Reach level 2.',
    rarity: 'common',
    unlockType: 'level',
    unlockValue: 2,
    rewardType: 'currency',
    grantTokens: 120,
  },
  {
    key: 'relay-badge',
    name: 'Relay Badge',
    requirement: 'Reach level 4.',
    rarity: 'rare',
    unlockType: 'level',
    unlockValue: 4,
    rewardType: 'badge',
  },
  {
    key: 'route-frame',
    name: 'Route Frame',
    requirement: 'Reach level 6.',
    rarity: 'rare',
    unlockType: 'level',
    unlockValue: 6,
    rewardType: 'frame',
  },
  {
    key: 'night-shift-operator',
    name: 'Night Shift Operator',
    requirement: 'Reach level 8.',
    rarity: 'epic',
    unlockType: 'level',
    unlockValue: 8,
    rewardType: 'title',
    titleKey: 'night-shift-operator',
  },
  {
    key: 'command-strip-nameplate',
    name: 'Command Strip',
    requirement: 'Reach level 10.',
    rarity: 'epic',
    unlockType: 'level',
    unlockValue: 10,
    rewardType: 'nameplate',
  },
  {
    key: 'deep-scan-cache',
    name: 'Deep Scan Cache',
    requirement: 'Reach level 12.',
    rarity: 'legendary',
    unlockType: 'level',
    unlockValue: 12,
    rewardType: 'currency',
    grantTokens: 420,
  },
  {
    key: 'trace-architect',
    name: 'Trace Architect',
    requirement: 'Reach level 16.',
    rarity: 'legendary',
    unlockType: 'level',
    unlockValue: 16,
    rewardType: 'title',
    titleKey: 'trace-architect',
  },
];

export const ACHIEVEMENT_DEFINITIONS = [
  {
    key: 'first-duel',
    name: 'First Contact',
    description: 'Finish one competitive room.',
    category: 'ranked',
    target: 1,
    metric: 'competitiveMatches',
  },
  {
    key: 'room-breaker',
    name: 'Rank Breaker',
    description: 'Win five competitive rooms.',
    category: 'ranked',
    target: 5,
    metric: 'competitiveWins',
  },
  {
    key: 'season-climber',
    name: 'Astral Ascent',
    description: 'Reach 10 season points.',
    category: 'ranked',
    target: 10,
    metric: 'seasonPoints',
  },
  {
    key: 'streak-line',
    name: 'Win Sequence',
    description: 'Hold a 3-win competitive streak.',
    category: 'ranked',
    target: 3,
    metric: 'bestWinStreak',
  },
  {
    key: 'bot-calibration',
    name: 'Calibration Cycle',
    description: 'Win five bot rooms in one season.',
    category: 'practice',
    target: 5,
    metric: 'practiceWins',
  },
  {
    key: 'clara-notes',
    name: 'Clara Field Notes',
    description: 'Finish three Clara Bot rooms.',
    category: 'practice',
    target: 3,
    metric: 'claraMatches',
  },
  {
    key: 'svarog-notes',
    name: 'Svarog Field Notes',
    description: 'Finish three Svarog Bot rooms.',
    category: 'practice',
    target: 3,
    metric: 'svarogMatches',
  },
  {
    key: 'contract-reader',
    name: 'Briefing Accepted',
    description: 'Clear one handcrafted challenge.',
    category: 'solver',
    target: 1,
    metric: 'solvedChallengeCount',
  },
  {
    key: 'solver-route',
    name: 'Route Engraved',
    description: 'Clear five handcrafted challenges.',
    category: 'solver',
    target: 5,
    metric: 'solvedChallengeCount',
  },
  {
    key: 'practice-draft',
    name: 'Proxy Warmup',
    description: 'Clear three generated challenges.',
    category: 'solver',
    target: 3,
    metric: 'generatedClears',
  },
  {
    key: 'sharp-score',
    name: 'Critical Route',
    description: 'Reach a 90 challenge score.',
    category: 'solver',
    target: 90,
    metric: 'bestChallengeScore',
    format: 'score',
  },
  {
    key: 'forge-warmup',
    name: 'Forge Warmup',
    description: 'Log three free training sessions.',
    category: 'training',
    target: 3,
    metric: 'freeTrainingSessions',
  },
  {
    key: 'full-calibration',
    name: 'Full Calibration',
    description: 'Max a relic in free training.',
    category: 'training',
    target: 1,
    metric: 'freeTrainingMaxed',
  },
  {
    key: 'drill-initiate',
    name: 'Drill Initiate',
    description: 'Clear the drills sequence once.',
    category: 'training',
    target: 1,
    metric: 'drillsClears',
  },
  {
    key: 'drill-exact',
    name: 'Drill Exact',
    description: 'Post a perfect drills clear.',
    category: 'training',
    target: 1,
    metric: 'drillsPerfectClears',
  },
  {
    key: 'lab-operator',
    name: 'Lab Operator',
    description: 'Complete five pattern lab analyses.',
    category: 'analysis',
    target: 5,
    metric: 'patternLabAnalyses',
  },
  {
    key: 'import-reader',
    name: 'Import Reader',
    description: 'Analyze two imported pattern lab sessions.',
    category: 'analysis',
    target: 2,
    metric: 'patternLabImports',
  },
];

export const TITLE_DEFINITION_MAP = new Map(TITLE_DEFINITIONS.map((entry) => [entry.key, entry]));
export const ACHIEVEMENT_DEFINITION_MAP = new Map(ACHIEVEMENT_DEFINITIONS.map((entry) => [entry.key, entry]));
export const RANK_TIER_DEFINITION_MAP = new Map(RANK_TIER_DEFINITIONS.map((entry) => [entry.key, entry]));
export const REWARD_DEFINITION_MAP = new Map(REWARD_DEFINITIONS.map((entry) => [entry.key, entry]));

export function getTitleDefinition(key) {
  return TITLE_DEFINITION_MAP.get(String(key || '').trim()) || null;
}

export function getAchievementDefinition(key) {
  return ACHIEVEMENT_DEFINITION_MAP.get(String(key || '').trim()) || null;
}

export function getRankTierDefinition(key) {
  return RANK_TIER_DEFINITION_MAP.get(String(key || '').trim()) || null;
}

export function resolveRankTier(points) {
  const numericPoints = Number(points);
  const safePoints = Number.isFinite(numericPoints) ? numericPoints : 0;
  let winner = RANK_TIER_DEFINITIONS[0];
  for (const tier of RANK_TIER_DEFINITIONS) {
    if (safePoints >= tier.minPoints) {
      winner = tier;
    }
  }
  return winner;
}

export function getRewardDefinition(key) {
  return REWARD_DEFINITION_MAP.get(String(key || '').trim()) || null;
}

export function getTotalXpRequiredForLevel(level) {
  const targetLevel = Math.max(1, Number(level) || 1);
  let total = 0;
  for (let currentLevel = 1; currentLevel < targetLevel; currentLevel += 1) {
    total += 180 + ((currentLevel - 1) * 70);
  }
  return total;
}
