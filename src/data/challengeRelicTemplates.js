export const CHALLENGE_RELIC_TEMPLATES = {
  dualCritEasy: {
    id: 'dualCritEasy',
    archetype: 'dualCrit',
    targetRelic: {
      setNameHint: 'Musketeer',
      pieceLabel: 'Body',
      mainStat: 'FLAT HP',
      lines: ['CRIT RATE', 'CRIT DMG', 'EFF RES'],
      fourthLine: 'BREAK EFFECT',
      hasFourthLine: false,
    },
    builderRelic: {
      setNameHint: 'Musketeer',
      pieceLabel: 'Head',
      mainStat: 'HP%',
      lines: ['ATK%', 'SPD', 'EFFECT HIT RATE'],
      fourthLine: 'BREAK EFFECT',
      hasFourthLine: false,
    },
    forceRelic: {
      setNameHint: 'Musketeer',
      pieceLabel: 'Hands',
      mainStat: 'ATK%',
      baseLines: 2,
      lines: ['HP%', 'SPD', 'OPEN LINE', 'BREAK EFFECT'],
    },
  },
  dualCritFourLine: {
    id: 'dualCritFourLine',
    archetype: 'dualCritCombined',
    targetRelic: {
      setNameHint: 'Musketeer',
      pieceLabel: 'Body',
      mainStat: 'FLAT HP',
      lines: ['CRIT RATE', 'CRIT DMG', 'SPD'],
      fourthLine: 'EFF RES',
      hasFourthLine: true,
    },
    builderRelic: {
      setNameHint: 'Musketeer',
      pieceLabel: 'Head',
      mainStat: 'HP%',
      lines: ['ATK%', 'BREAK EFFECT', 'EFFECT HIT RATE'],
      fourthLine: 'SPD',
      hasFourthLine: false,
    },
    forceRelic: {
      setNameHint: 'Musketeer',
      pieceLabel: 'Hands',
      mainStat: 'ATK%',
      baseLines: 2,
      lines: ['HP%', 'SPD', 'OPEN LINE', 'BREAK EFFECT'],
    },
  },
  monoSpd: {
    id: 'monoSpd',
    archetype: 'monoLine',
    targetRelic: {
      setNameHint: 'Musketeer',
      pieceLabel: 'Feet',
      mainStat: 'FLAT ATK',
      lines: ['FLAT ATK', 'SPD', 'FLAT HP'],
      fourthLine: 'EFFECT HIT RATE',
      hasFourthLine: false,
    },
    builderRelic: {
      setNameHint: 'Musketeer',
      pieceLabel: 'Head',
      mainStat: 'HP%',
      lines: ['ATK%', 'BREAK EFFECT', 'SPD'],
      fourthLine: 'EFFECT RES',
      hasFourthLine: false,
    },
    forceRelic: {
      setNameHint: 'Musketeer',
      pieceLabel: 'Hands',
      mainStat: 'ATK%',
      baseLines: 1,
      lines: ['HP%', 'OPEN LINE', 'SPD', 'BREAK EFFECT'],
    },
  },
};

export function getChallengeRelicTemplate(templateId = 'dualCritEasy') {
  return CHALLENGE_RELIC_TEMPLATES[templateId] || CHALLENGE_RELIC_TEMPLATES.dualCritEasy;
}
