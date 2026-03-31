export const CHALLENGE_HINT_PACKS = {
  dualCrit: [
    'The pair is readable, but only a crit landing makes this contract clear.',
    'If direct upgrades flirt with junk, the pair is not truly safe for this relic.',
    'Use a detour before the next real target upgrade.',
  ],
  dualCritCombined: [
    'You do not need perfect mono hits here, but you do need enough total crit-side value.',
    'One side of the pair may be usable while the other side is still a trap.',
    'Detour when the current pair only half-solves the relic.',
  ],
  monoLine: [
    'This contract is about discipline, not just one lucky hit.',
    'If the path drifts after the first success, re-force before committing again.',
    'To clear, keep the same target line alive across multiple upgrades.',
  ],
  lateNoise: [
    'The lane that was safe earlier may not still be safe now.',
    'Check the late pressure before trusting old commons.',
    'This finish is solved by reading live noise, not by replaying the early read.',
  ],
};

export function getChallengeHintPack(packId = 'dualCrit') {
  return CHALLENGE_HINT_PACKS[packId] || CHALLENGE_HINT_PACKS.dualCrit;
}
