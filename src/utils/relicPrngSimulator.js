/**
 * HSR Relic PRNG Mimicry Engine (Standalone Prototype)
 * 
 * This module simulates the behavior of the HSR server's PRNG using:
 * 1. A seedable math generator (Mulberry32).
 * 2. High-level "Regimes" (Stable, Chaotic, Dominant).
 * 3. Caesar-mapping helpers to generate "RAW" strings for the predictor.
 */

/**
 * Seedable 32-bit PRNG (Mulberry32)
 */
function createGenerator(seed = 1) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class HsrPrngSimulator {
  constructor(options = {}) {
    this.seed = options.seed || Math.floor(Math.random() * 1000000);
    this.generator = createGenerator(this.seed);
    this.regime = options.regime || 'stable'; // 'stable', 'chaotic', 'dominant'
    
    // Internal state tracking
    this.history = [];
    this.commons = options.commons || ['41', '42'];
    this.noise = options.noise || ['43', '44'];
    this.dominantValue = options.dominantValue || '43';
    
    // Pattern Injection Queue (e.g. ['43', '43', '43'])
    this.injectionQueue = [];
  }

  /**
   * Update the simulation mood/regime
   */
  setRegime(regime, options = {}) {
    this.regime = regime;
    if (options.commons) this.commons = options.commons;
    if (options.noise) this.noise = options.noise;
    if (options.dominantValue) this.dominantValue = options.dominantValue;
    this.injectionQueue = []; // Clear queue on regime shift
  }

  /**
   * Force specific next rolls
   */
  inject(patternArray) {
    this.injectionQueue = [...this.injectionQueue, ...patternArray];
  }

  /**
   * Generate the next "4x" roll based on the current regime
   */
  nextRoll() {
    // 1. Check Injection Queue first
    if (this.injectionQueue.length > 0) {
      const roll = this.injectionQueue.shift();
      this.history.push(roll);
      return roll;
    }

    const rand = this.generator();
    let roll = '41';

    switch (this.regime) {
      case 'stable':
        // 85% chance to hit a common (alternating or repeating)
        if (rand < 0.85) {
          const last = this.history[this.history.length - 1];
          // If last was a common, maybe alternate?
          if (this.commons.includes(last)) {
            const otherCommon = this.commons.find(c => c !== last);
            // 60% chance to alternate, 40% to repeat or stick
            roll = this.generator() < 0.6 ? otherCommon : last;
          } else {
            roll = this.generator() < 0.5 ? this.commons[0] : this.commons[1];
          }
        } else {
          // 15% noise
          roll = this.generator() < 0.5 ? this.noise[0] : this.noise[1];
        }
        break;

      case 'chaotic':
        // Near-equal weight but with "Lumping" (recently hit value has +10% bias)
        const lastVal = this.history[this.history.length - 1];
        const weights = { '41': 25, '42': 25, '43': 25, '44': 25 };
        if (lastVal && weights[lastVal]) weights[lastVal] += 10;
        
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let acc = 0;
        const selector = this.generator() * total;
        for (const [val, w] of Object.entries(weights)) {
          acc += w;
          if (selector <= acc) {
            roll = val;
            break;
          }
        }
        break;

      case 'dominant':
        // 65% for dominantValue, 20% for runner-up, 15% others
        const runnerUp = this.commons.find(c => c !== this.dominantValue) || this.noise[0];
        if (rand < 0.65) roll = this.dominantValue;
        else if (rand < 0.85) roll = runnerUp;
        else {
          const remaining = ['41', '42', '43', '44'].filter(v => v !== this.dominantValue && v !== runnerUp);
          roll = this.generator() < 0.5 ? remaining[0] : remaining[1];
        }
        break;

      default:
        roll = ['41', '42', '43', '44'][Math.floor(this.generator() * 4)];
    }

    this.history.push(roll);
    if (this.history.length > 50) this.history.shift();
    return roll;
  }

  /**
   * Mimic the Caesar Decoded string generation
   * Takes a target 4x roll and the previous character to find a "RAW" digit (1-8)
   * that would translate to it.
   */
  getRawDigit(target4x, prevChar = '4') {
    // translateTo4(str) uses digits[0] to determine first char shift.
    // If we assume the long string starts with a '4', shift is 0.
    // If shift is 0, 1 -> 4, 2 -> 1, 3 -> 2, 4 -> 3. (Mapping zero-based (d-1+0)%4 + 1)
    
    const targetDigit = parseInt(target4x.slice(1), 10); // e.g. "42" -> 2
    
    // Map of TARGET digit -> REQUIRED RAW digit (assuming shift 0)
    // 4 -> 1, 1 -> 2, 2 -> 3, 3 -> 4
    const map = { 4: 1, 1: 2, 2: 3, 3: 4 };
    return map[targetDigit].toString();
  }

  /**
   * Generate a batch of rolls formatted for the Session Table
   */
  generateBatch(count = 20) {
    const results = [];
    let currentRawStr = '4'; // Start with 4 to ensure shift 0
    
    for (let i = 0; i < count; i++) {
        const roll = this.nextRoll();
        const rawDigit = this.getRawDigit(roll);
        currentRawStr += rawDigit;
        
        results.push({
            id: `sim-${Date.now()}-${i}`,
            raw: `4${rawDigit}`, // Simplification for session display
            translated: roll,
            time: new Date(Date.now() - (count - i) * 60000).toISOString()
        });
    }
    return results;
  }
}
