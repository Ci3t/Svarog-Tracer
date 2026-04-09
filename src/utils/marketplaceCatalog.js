const RARITY_PRICE_FLOORS = {
  common: 60,
  rare: 120,
  epic: 260,
  legendary: 560,
  mythic: 920,
};

const SLOT_PRICE_MULTIPLIERS = {
  badge: 0.46,
  frame: 0.62,
  nameplate: 0.76,
  title: 0.9,
  clara_playground: 0.66,
  clara_guide: 0.62,
};

function rebalanceMarketplaceCost(item) {
  const baseCost = Number(item?.cost || 0);
  if (!Number.isFinite(baseCost) || baseCost <= 0) return 0;
  const rarity = String(item?.rarity || 'common').trim().toLowerCase();
  const slot = String(item?.slot || '').trim().toLowerCase();
  const floor = RARITY_PRICE_FLOORS[rarity] || 120;
  const multiplier = SLOT_PRICE_MULTIPLIERS[slot] || 0.72;
  const scaled = Math.round((baseCost * multiplier) / 10) * 10;
  return Math.max(floor, scaled);
}

const RAW_MARKETPLACE_ITEMS = [
  /* --- PREMIUM SET 1: QUANTUM NEON --- */
  { key: 'quantum-neon-title', name: 'Quantum Neon', type: 'title', slot: 'title', rarity: 'mythic', cost: 3000, description: 'Quantum network master.' },
  { key: 'quantum-neon-banner', name: 'Neon Stream', type: 'nameplate', slot: 'nameplate', rarity: 'epic', cost: 1500, description: 'Animated scanlines and data pulses.' },
  { key: 'quantum-neon-frame', name: 'Quantum Neon', type: 'frame', slot: 'frame', rarity: 'epic', cost: 1200, description: 'Neon brackets to frame your TR-1 profile presence.' },
  { key: 'quantum-neon-badge', name: 'Svarog Eye', type: 'badge', slot: 'badge', rarity: 'epic', cost: 800, description: 'Svarog diagnostic core with real-time status.' },

  /* --- PREMIUM SET 2: ASTRAL FORGE --- */
  { key: 'astral-forge-title', name: 'Astral Forge', type: 'title', slot: 'title', rarity: 'legendary', cost: 2600, description: 'Forged in the heart of a dying star.' },
  { key: 'astral-forge-banner', name: 'Astral Forge', type: 'nameplate', slot: 'nameplate', rarity: 'legendary', cost: 2200, description: 'Heavy hammered metal against a deep space horizon.' },
  { key: 'astral-forge-frame', name: 'Astral Forge', type: 'frame', slot: 'frame', rarity: 'legendary', cost: 1800, description: 'Thick armor plating to fortify your avatar.' },
  { key: 'astral-forge-badge', name: 'Relic Tuner', type: 'badge', slot: 'badge', rarity: 'legendary', cost: 1100, description: 'High-precision relic resonance manipulation.' },

  /* --- PREMIUM SET 3: HACKER NOIR --- */
  { key: 'hacker-noir-title', name: 'Hacker Noir', type: 'title', slot: 'title', rarity: 'mythic', cost: 3500, description: 'Network ghost protocol.' },
  { key: 'hacker-noir-banner', name: 'Hacker Noir', type: 'nameplate', slot: 'nameplate', rarity: 'epic', cost: 1600, description: 'Matrix rain and a digital phantom protocol.' },
  { key: 'hacker-noir-frame', name: 'Hacker Noir', type: 'frame', slot: 'frame', rarity: 'epic', cost: 1100, description: 'Mechanical tech casing with warning sensors.' },
  { key: 'hacker-noir-badge', name: 'Silver Wolf Script', type: 'badge', slot: 'badge', rarity: 'epic', cost: 550, description: 'Graffiti-coded network exception.' },

  /* --- PREMIUM SET 4: PHOENIX RISE --- */
  { key: 'phoenix-rise-title', name: 'Phoenix Rise', type: 'title', slot: 'title', rarity: 'mythic', cost: 4200, description: 'Reborn from ashes.' },
  { key: 'phoenix-rise-banner', name: 'Phoenix Rise', type: 'nameplate', slot: 'nameplate', rarity: 'mythic', cost: 3500, description: 'Born from the golden sun.' },
  { key: 'phoenix-rise-frame', name: 'Phoenix Rise', type: 'frame', slot: 'frame', rarity: 'mythic', cost: 2800, description: 'Enormous wings embracing the avatar core.' },
  { key: 'phoenix-rise-badge', name: 'SAM Core', type: 'badge', slot: 'badge', rarity: 'mythic', cost: 1400, description: 'Molten heart of a Stellaron Hunter.' },

  /* --- PREMIUM SET 5: VOID LATTICE --- */
  { key: 'void-lattice-title', name: 'Void Lattice', type: 'title', slot: 'title', rarity: 'legendary', cost: 2800, description: 'Trapped in the fracture.' },
  { key: 'void-lattice-banner', name: 'Void Lattice', type: 'nameplate', slot: 'nameplate', rarity: 'epic', cost: 1400, description: 'A fracture in the void, spinning into silence.' },
  { key: 'void-lattice-frame', name: 'Void Lattice', type: 'frame', slot: 'frame', rarity: 'epic', cost: 950, description: 'Shattered crystal edges bound by gravity.' },
  { key: 'void-lattice-badge', name: 'Nihility Crest', type: 'badge', slot: 'badge', rarity: 'epic', cost: 500, description: 'The absolute emptiness of IX.' },

  /* --- PREMIUM SET 6: SOLARIS OVERCLOCK --- */
  { key: 'solaris-overclock-title', name: 'Solaris Overclock', type: 'title', slot: 'title', rarity: 'legendary', cost: 3200, description: 'Energy output exceeding limits.' },
  { key: 'solaris-overclock-banner', name: 'Solar Flare', type: 'nameplate', slot: 'nameplate', rarity: 'legendary', cost: 2000, description: 'Animated solar emissions and heat haze.' },
  { key: 'solaris-overclock-frame', name: 'Solaris', type: 'frame', slot: 'frame', rarity: 'legendary', cost: 1500, description: 'Active solar flares rotating around the core.' },
  { key: 'solaris-overclock-badge', name: 'Nanook Ruin', type: 'badge', slot: 'badge', rarity: 'legendary', cost: 900, description: 'The gaze of Destruction.' },

  /* --- PREMIUM SET 7: GLITCH PROTOCOL --- */
  { key: 'glitch-protocol-title', name: 'Glitch Protocol', type: 'title', slot: 'title', rarity: 'mythic', cost: 4500, description: 'Fatal system corruption.' },
  { key: 'glitch-protocol-banner', name: 'Glitch Protocol', type: 'nameplate', slot: 'nameplate', rarity: 'mythic', cost: 2800, description: 'Unstable chromatic aberration and system errors.' },
  { key: 'glitch-protocol-frame', name: 'Glitch Protocol', type: 'frame', slot: 'frame', rarity: 'mythic', cost: 2200, description: 'A bounding box constantly fighting its own geometry.' },
  { key: 'glitch-protocol-badge', name: 'Glitch Protocol', type: 'badge', slot: 'badge', rarity: 'mythic', cost: 1200, description: 'A corrupted file identifier.' },

  /* --- PREMIUM SET 8: SINGULARITY MATRIX --- */
  { key: 'singularity-matrix-title', name: 'Singularity Matrix', type: 'title', slot: 'title', rarity: 'mythic', cost: 5000, description: 'Event horizon reached.' },
  { key: 'singularity-matrix-banner', name: 'Accretion Disk', type: 'nameplate', slot: 'nameplate', rarity: 'mythic', cost: 4000, description: 'Animated black hole event horizon.' },
  { key: 'singularity-matrix-frame', name: 'Event Horizon', type: 'frame', slot: 'frame', rarity: 'mythic', cost: 3200, description: 'Massive gravitational lensing.' },
  { key: 'singularity-matrix-badge', name: 'Warp Ticket', type: 'badge', slot: 'badge', rarity: 'mythic', cost: 1800, description: 'Priority passage through the stars.' },

  /* --- PREMIUM SET 9: CYBER SAMURAI --- */
  { key: 'cyber-samurai-title', name: 'Cyber Samurai', type: 'title', slot: 'title', rarity: 'epic', cost: 2000, description: 'Bushido in the digital age.' },
  { key: 'cyber-samurai-banner', name: 'Cyber Samurai', type: 'nameplate', slot: 'nameplate', rarity: 'epic', cost: 1400, description: 'Brushed crimson steel polished by blood.' },
  { key: 'cyber-samurai-frame', name: 'Cyber Samurai', type: 'frame', slot: 'frame', rarity: 'epic', cost: 1000, description: 'A red neon katana slice binding your avatar.' },
  { key: 'cyber-samurai-badge', name: 'Cyber Samurai', type: 'badge', slot: 'badge', rarity: 'epic', cost: 600, description: 'The crest of the Ronin clan.' },

  /* --- PREMIUM SET 10: DEEP DIVE --- */
  { key: 'deep-dive-title', name: 'Deep Dive', type: 'title', slot: 'title', rarity: 'legendary', cost: 2600, description: 'Abyssal pressure tolerated.' },
  { key: 'deep-dive-banner', name: 'Deep Dive', type: 'nameplate', slot: 'nameplate', rarity: 'legendary', cost: 1800, description: 'Bioluminescence from the ocean floor.' },
  { key: 'deep-dive-frame', name: 'Deep Dive', type: 'frame', slot: 'frame', rarity: 'legendary', cost: 1200, description: 'Pressurized reinforced diving ring.' },
  { key: 'deep-dive-badge', name: 'Deep Dive', type: 'badge', slot: 'badge', rarity: 'legendary', cost: 800, description: 'The aquatic vanguard emblem.' },

  /* --- PREMIUM SET 11: PLASMA OVERLOAD --- */
  { key: 'plasma-overload-title', name: 'Plasma Overload', type: 'title', slot: 'title', rarity: 'legendary', cost: 3200, description: 'Direct energy injection.' },
  { key: 'plasma-overload-banner', name: 'Plasma Overload', type: 'nameplate', slot: 'nameplate', rarity: 'legendary', cost: 2200, description: 'High-frequency electric oscillations.' },
  { key: 'plasma-overload-frame', name: 'Plasma Overload', type: 'frame', slot: 'frame', rarity: 'legendary', cost: 1500, description: 'Supercharged containment ring.' },
  { key: 'plasma-overload-badge', name: 'Plasma Overload', type: 'badge', slot: 'badge', rarity: 'legendary', cost: 1000, description: 'The spark of divinity.' },

  /* --- PREMIUM SET 12: VOID VORTEX --- */
  { key: 'void-vortex-title', name: 'Void Vortex', type: 'title', slot: 'title', rarity: 'mythic', cost: 5500, description: 'Gaze into the abyss.' },
  { key: 'void-vortex-banner', name: 'Void Vortex', type: 'nameplate', slot: 'nameplate', rarity: 'mythic', cost: 4500, description: 'The swirling heart of a dead star.' },
  { key: 'void-vortex-frame', name: 'Void Vortex', type: 'frame', slot: 'frame', rarity: 'mythic', cost: 3500, description: 'Instability stabilized.' },
  { key: 'void-vortex-badge', name: 'Void Vortex', type: 'badge', slot: 'badge', rarity: 'mythic', cost: 2000, description: 'The mark of the void-walker.' },

  /* --- PREMIUM SET 13: NEBULA VOYAGER (NEW) --- */
  { key: 'nebula-voyager-title', name: 'Nebula Voyager', type: 'title', slot: 'title', rarity: 'mythic', cost: 6000, description: 'Master of the star-trails.' },
  { key: 'nebula-voyager-banner', name: 'Nebula Voyager', type: 'nameplate', slot: 'nameplate', rarity: 'mythic', cost: 5000, description: 'Ethereal curtains of cosmic light.' },
  { key: 'nebula-voyager-frame', name: 'Nebula Voyager', type: 'frame', slot: 'frame', rarity: 'mythic', cost: 4000, description: 'Pulsing stardust ring with gravitational lensing.' },
  { key: 'nebula-voyager-badge', name: 'Nebula Voyager', type: 'badge', slot: 'badge', rarity: 'mythic', cost: 2500, description: 'The Navigator’s emblem.' },

  /* --- PREMIUM SET 14: STELLAR ECHO (NEW) --- */
  { key: 'stellar-echo-title', name: 'Stellar Echo', type: 'title', slot: 'title', rarity: 'legendary', cost: 4800, description: 'The resonance of eternity.' },
  { key: 'stellar-echo-banner', name: 'Stellar Echo', type: 'nameplate', slot: 'nameplate', rarity: 'legendary', cost: 3800, description: 'A pulsing star at the heart of the galaxy.' },
  { key: 'stellar-echo-frame', name: 'Stellar Echo', type: 'frame', slot: 'frame', rarity: 'legendary', cost: 2800, description: 'Rotating diamond shards of pure light.' },
  { key: 'stellar-echo-badge', name: 'Stellar Echo', type: 'badge', slot: 'badge', rarity: 'legendary', cost: 1800, description: 'The mark of the Resonance.' },

  /* --- PREMIUM SET 15: AETHER BLADE (NEW) --- */
  { key: 'aether-blade-title', name: 'Aether Blade', type: 'title', slot: 'title', rarity: 'epic', cost: 2500, description: 'Digital precision, absolute lethality.' },
  { key: 'aether-blade-banner', name: 'Aether Blade', type: 'nameplate', slot: 'nameplate', rarity: 'epic', cost: 1800, description: 'Digital slash effects across the data-stream.' },
  { key: 'aether-blade-frame', name: 'Aether Blade', type: 'frame', slot: 'frame', rarity: 'epic', cost: 1200, description: 'Glitched containment perimeter.' },
  { key: 'aether-blade-badge', name: 'Aether Blade', type: 'badge', slot: 'badge', rarity: 'epic', cost: 800, description: 'Sync protocol engaged.' },

  /* --- PLAYGROUND ACHIEVEMENT REWARDS --- */
  { key: 'drill-master-title', name: 'Drill Master', type: 'title', slot: 'title', rarity: 'rare', cost: 0, description: 'Earned by completing all Beginner Drills.' },
  { key: 'pattern-seeker-title', name: 'Pattern Seeker', type: 'title', slot: 'title', rarity: 'epic', cost: 0, description: 'Earned by reaching Level 10 in the Playground.' },
  { key: 'relic-oracle-title', name: 'Relic Oracle', type: 'title', slot: 'title', rarity: 'legendary', cost: 0, description: 'Earned by 100% accuracy in Predictor Drills.' },
  { key: 'pioneer-badge', name: 'Playground Pioneer', type: 'badge', slot: 'badge', rarity: 'rare', cost: 0, description: 'The mark of an early adopter.' },

  /* --- CLARA SKINS --- */
  { key: 'clara-og-playground', name: 'Clara Original', type: 'companion', slot: 'clara_playground', rarity: 'common', cost: 0, defaultOwned: true, availableInShop: false, description: 'Restore the original Playground Clara model and mad-mode reactions.' },
  { key: 'clara-og-guide', name: 'Guide Clara Original', type: 'companion', slot: 'clara_guide', rarity: 'common', cost: 0, defaultOwned: true, availableInShop: false, description: 'Restore the original half-Clara guide model used in tours and lesson panels.' },
  { key: 'clara-kimono-playground', name: 'Clara Kimono', type: 'companion', slot: 'clara_playground', rarity: 'legendary', cost: 1800, description: 'Swap the Playground Clara model with her kimono variant.' },
  { key: 'clara-maid-playground', name: 'Clara Maid', type: 'companion', slot: 'clara_playground', rarity: 'epic', cost: 1400, description: 'A lighter Playground Clara outfit with the same voice set.' },
  { key: 'clara-science-playground', name: 'Clara Science', type: 'companion', slot: 'clara_playground', rarity: 'epic', cost: 1400, description: 'Lab-ready Clara for the Playground hub and live assist panels.' },
  { key: 'clara-snowy-playground', name: 'Clara Snowy', type: 'companion', slot: 'clara_playground', rarity: 'legendary', cost: 1800, description: 'Winter Clara for Playground scenes and the tutorial intro/end screens.' },
  { key: 'clara-kimono-guide', name: 'Guide Clara Kimono', type: 'companion', slot: 'clara_guide', rarity: 'epic', cost: 1300, description: 'Swap the half-Clara guide model used in tours and lesson panels.' },
  { key: 'clara-snowy-guide', name: 'Guide Clara Snowy', type: 'companion', slot: 'clara_guide', rarity: 'epic', cost: 1300, description: 'A winter half-Clara variant for guided tours and coaching surfaces.' },

  /* --- MISC TITLES --- */
  { key: 'stellar-overclock-title', name: 'Stellar Overclock', type: 'title', slot: 'title', rarity: 'epic', cost: 950, description: 'Energy routing maximized.' },
  { key: 'ghost-protocol-title', name: 'Ghost Protocol', type: 'title', slot: 'title', rarity: 'legendary', cost: 1400, description: 'Stealth optics engaged.' },
  { key: 'zero-day-oracle-title', name: 'Zero-Day Oracle', type: 'title', slot: 'title', rarity: 'mythic', cost: 3200, description: 'You saw the network fall before it happened.' },
  { key: 'tracer-paragon-title', name: 'Tracer Paragon', type: 'title', slot: 'title', rarity: 'mythic', cost: 4200, description: 'Peak Svarog tracker performance.' },
  { key: 'eclipse-solver-title', name: 'Eclipse_Solver', type: 'title', slot: 'title', rarity: 'mythic', cost: 5800, description: 'You solved the dark star anomaly.' }
];

export const MARKETPLACE_ITEMS = RAW_MARKETPLACE_ITEMS.map((item) => ({
  ...item,
  cost: rebalanceMarketplaceCost(item),
}));

export const MARKETPLACE_ITEM_MAP = new Map(MARKETPLACE_ITEMS.map((entry) => [entry.key, entry]));

export function getMarketplaceItem(key) {
  return MARKETPLACE_ITEM_MAP.get(String(key || '').trim()) || null;
}

export function resolveEquippedCosmeticsFromMetadata(metadata) {
  const source = metadata && typeof metadata === 'object' ? metadata : {};
  return {
    badgeKey: String(source.svarog_equipped_badge || '').trim(),
    nameplateKey: String(source.svarog_equipped_nameplate || '').trim(),
    frameKey: String(source.svarog_equipped_frame || '').trim(),
    claraPlaygroundKey: String(source.svarog_equipped_clara_playground || '').trim(),
    claraGuideKey: String(source.svarog_equipped_clara_guide || '').trim(),
  };
}

export function getCosmeticAccentStyle(rarity = 'common') {
  const normalized = String(rarity || 'common').trim().toLowerCase();
  if (normalized === 'mythic') {
    return {
      borderColor: 'rgba(255, 107, 159, 0.42)',
      background: 'linear-gradient(90deg, rgba(255,107,159,0.16), rgba(255,209,102,0.12))',
      color: '#ffafc8',
    };
  }
  if (normalized === 'legendary') {
    return {
      borderColor: 'rgba(246, 183, 60, 0.38)',
      background: 'rgba(246, 183, 60, 0.10)',
      color: '#f6d27b',
    };
  }
  if (normalized === 'epic') {
    return {
      borderColor: 'rgba(199, 146, 255, 0.34)',
      background: 'rgba(199, 146, 255, 0.10)',
      color: '#d2abff',
    };
  }
  if (normalized === 'rare') {
    return {
      borderColor: 'rgba(95, 215, 255, 0.30)',
      background: 'rgba(95, 215, 255, 0.08)',
      color: '#8fe4ff',
    };
  }
  return {
    borderColor: 'var(--theme-border-soft)',
    background: 'var(--theme-surface-2)',
    color: 'var(--theme-text-muted)',
  };
}

export function getAvatarFrameStyle(frameKey = '') {
  const item = getMarketplaceItem(frameKey);
  if (!item) {
    return {
      borderColor: 'var(--theme-border-soft)',
      boxShadow: 'none',
    };
  }

  const rarity = String(item.rarity || 'common').trim().toLowerCase();
  const accent = getCosmeticAccentStyle(rarity);

  if (rarity === 'mythic') {
    return {
      borderColor: '#ff6b9f',
      boxShadow: '0 0 0 3px rgba(255, 107, 159, 0.4), 0 0 30px rgba(255, 107, 159, 0.25), inset 0 0 15px rgba(255, 107, 159, 0.2)',
    };
  }
  if (rarity === 'legendary') {
    return {
      borderColor: '#f6b73c',
      boxShadow: '0 0 0 2px rgba(246, 183, 60, 0.35), 0 0 24px rgba(246, 183, 60, 0.2), inset 0 0 10px rgba(246, 183, 60, 0.15)',
    };
  }

  return {
    borderColor: accent.borderColor,
    boxShadow: rarity === 'epic'
      ? '0 0 0 2px rgba(199, 146, 255, 0.38), 0 0 18px rgba(199, 146, 255, 0.18)'
      : rarity === 'rare'
        ? '0 0 0 2px rgba(95, 215, 255, 0.34), 0 0 12px rgba(95, 215, 255, 0.14)'
        : '0 0 0 1px var(--theme-border-soft)',
  };
}
