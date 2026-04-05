export const MARKETPLACE_ITEMS = [
  {
    key: 'signal-frame',
    name: 'Signal Frame',
    type: 'frame',
    slot: 'frame',
    rarity: 'common',
    cost: 120,
    description: 'Clean signal border for profile and member identity.',
  },
  {
    key: 'rift-ops-mark',
    name: 'Rift Ops Mark',
    type: 'badge',
    slot: 'badge',
    rarity: 'rare',
    cost: 260,
    description: 'Operator badge for ranked grinders.',
  },
  {
    key: 'prism-nameplate',
    name: 'Prism Nameplate',
    type: 'nameplate',
    slot: 'nameplate',
    rarity: 'legendary',
    cost: 820,
    description: 'Refined prism strip behind your identity.',
  },
  {
    key: 'void-lattice-frame',
    name: 'Void Lattice',
    type: 'frame',
    slot: 'frame',
    rarity: 'epic',
    cost: 540,
    description: 'Sharp lattice frame with a darker read.',
  },
  {
    key: 'astral-seal',
    name: 'Astral Seal',
    type: 'badge',
    slot: 'badge',
    rarity: 'epic',
    cost: 620,
    description: 'Seasonal prestige badge with stronger presence.',
  },
  {
    key: 'marshal-strip',
    name: 'Marshal Strip',
    type: 'nameplate',
    slot: 'nameplate',
    rarity: 'epic',
    cost: 700,
    description: 'Command-strip plate with a sharper accent read.',
  },
  {
    key: 'solver-sigil',
    name: 'Solver Sigil',
    type: 'badge',
    slot: 'badge',
    rarity: 'epic',
    cost: 0,
    availableInShop: false,
    description: 'Reward badge for solver ladder progress.',
  },
  {
    key: 'drill-frame',
    name: 'Drill Frame',
    type: 'frame',
    slot: 'frame',
    rarity: 'rare',
    cost: 0,
    availableInShop: false,
    description: 'Reward frame for clearing the drills sequence.',
  },
  {
    key: 'analysis-banner',
    name: 'Analysis Banner',
    type: 'nameplate',
    slot: 'nameplate',
    rarity: 'epic',
    cost: 0,
    availableInShop: false,
    description: 'Reward banner for repeated pattern lab analysis work.',
  },
  {
    key: 'relay-badge',
    name: 'Relay Badge',
    type: 'badge',
    slot: 'badge',
    rarity: 'rare',
    cost: 0,
    availableInShop: false,
    description: 'Level reward badge for accounts building steady field reps.',
  },
  {
    key: 'route-frame',
    name: 'Route Frame',
    type: 'frame',
    slot: 'frame',
    rarity: 'rare',
    cost: 0,
    availableInShop: false,
    description: 'Level reward frame for cleaner profile read across the site.',
  },
  {
    key: 'command-strip-nameplate',
    name: 'Command Strip',
    type: 'nameplate',
    slot: 'nameplate',
    rarity: 'epic',
    cost: 0,
    availableInShop: false,
    description: 'Level reward banner tuned for a sharper command-panel identity.',
  },
  {
    key: 'stellar-overclock',
    name: 'Stellar Overclock',
    type: 'title',
    slot: 'title',
    rarity: 'epic',
    cost: 950,
    titleKey: 'stellar-overclock',
    description: 'Market title for players who want a stronger profile identity.',
  },
  {
    key: 'ghost-protocol',
    name: 'Ghost Protocol',
    type: 'title',
    slot: 'title',
    rarity: 'legendary',
    cost: 1400,
    titleKey: 'ghost-protocol',
    description: 'Legendary market title with a colder high-tier read.',
  },
  {
    key: 'zero-day-oracle',
    name: 'Zero-Day Oracle',
    type: 'title',
    slot: 'title',
    rarity: 'mythic',
    cost: 3200,
    titleKey: 'zero-day-oracle',
    description: 'Mythic market title with a stronger animated finish.',
  },
  {
    key: 'tracer-paragon',
    name: 'Tracer Paragon',
    type: 'title',
    slot: 'title',
    rarity: 'mythic',
    cost: 4200,
    titleKey: 'tracer-paragon',
    description: 'Top-end market title built for the Svarog Tracer identity.',
  },
  {
    key: 'hollow-singularity',
    name: 'Hollow Singularity',
    type: 'title',
    slot: 'title',
    rarity: 'mythic',
    cost: 4800,
    titleKey: 'hollow-singularity',
    description: 'Mythic market title with a colder singularity-grade finish.',
  },
  {
    key: 'aeon-splitter',
    name: 'Aeon Splitter',
    type: 'title',
    slot: 'title',
    rarity: 'legendary',
    cost: 1650,
    titleKey: 'aeon-splitter',
    description: 'High-tier market title with a sharper HSR-style read.',
  },
  {
    key: 'signal-wraith',
    name: 'Signal Wraith',
    type: 'title',
    slot: 'title',
    rarity: 'epic',
    cost: 1100,
    titleKey: 'signal-wraith',
    description: 'Epoc-market title tuned for stealthier high-skill profiles.',
  },
  {
    key: 'starrail-operator',
    name: 'Starrail Operator',
    type: 'title',
    slot: 'title',
    rarity: 'rare',
    cost: 420,
    titleKey: 'starrail-operator',
    description: 'A cleaner all-purpose market title for active tracer accounts.',
  },
  {
    key: 'night-shift-operator',
    name: 'Night Shift Operator',
    type: 'title',
    slot: 'title',
    rarity: 'epic',
    cost: 0,
    availableInShop: false,
    titleKey: 'night-shift-operator',
    description: 'Level reward title for operators who keep building after hours.',
  },
  {
    key: 'trace-architect',
    name: 'Trace Architect',
    type: 'title',
    slot: 'title',
    rarity: 'legendary',
    cost: 0,
    availableInShop: false,
    titleKey: 'trace-architect',
    description: 'High-level reward title for accounts with deep season investment.',
  },
];

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

  const accent = getCosmeticAccentStyle(item.rarity);
  return {
    borderColor: accent.borderColor,
    boxShadow: item.rarity === 'mythic'
      ? '0 0 0 2px rgba(255, 107, 159, 0.46), 0 0 20px rgba(255, 107, 159, 0.26)'
      : item.rarity === 'legendary'
        ? '0 0 0 2px rgba(246, 183, 60, 0.42), 0 0 16px rgba(246, 183, 60, 0.22)'
        : item.rarity === 'epic'
          ? '0 0 0 2px rgba(199, 146, 255, 0.38), 0 0 14px rgba(199, 146, 255, 0.20)'
          : item.rarity === 'rare'
            ? '0 0 0 2px rgba(95, 215, 255, 0.34), 0 0 12px rgba(95, 215, 255, 0.18)'
            : '0 0 0 1px var(--theme-border-soft)',
  };
}
