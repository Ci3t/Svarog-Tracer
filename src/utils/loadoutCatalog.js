import { TITLE_DEFINITION_MAP } from './progressionCatalog.js';
import { MARKETPLACE_ITEM_MAP } from './marketplaceCatalog.js';

export const PRESET_LOADOUTS = [
  {
    key: 'quantum-neon',
    name: 'Quantum Neon',
    theme: 'neon',
    description: 'Hyper-pink data rain & neon blue signal matrix.',
    title: 'zero-day-oracle',
    frame: 'hyper-link-frame',
    badge: 'relay-badge',
    banner: 'singularity-matrix-banner',
    accentColor: '#ff6b9f',
  },
  {
    key: 'astral-forge',
    name: 'Astral Forge',
    theme: 'forge',
    description: 'Metallic silver forge textures & deep space nebula drift.',
    title: 'aeon-splitter',
    frame: 'signal-frame', // To be improved with metallic look
    badge: 'astral-seal',
    banner: 'analysis-banner',
    accentColor: '#f6b73c',
  },
  {
    key: 'hacker-noir',
    name: 'Hacker Noir',
    theme: 'noir',
    description: 'Deep green matrix code rain and high-contrast glitching.',
    title: 'ghost-protocol',
    frame: 'void-lattice-frame',
    badge: 'solver-sigil',
    banner: 'singularity-matrix-banner', // Will trigger green matrix via key
    accentColor: '#34d399',
  },
  {
    key: 'phoenix-rise',
    name: 'Phoenix Rise',
    theme: 'phoenix',
    description: 'Radiant solar flares with floating orange ember particles.',
    title: 'tracer-paragon',
    frame: 'route-frame',
    badge: 'astral-seal',
    banner: 'analysis-banner', // Will trigger solar flare via key
    accentColor: '#ffae00',
  },
  {
    key: 'glitch-overflow',
    name: 'Glitch Overflow',
    theme: 'glitch',
    description: "Hyper-cyan chromatic aberration and digital 'No Signal' artifacts.",
    title: 'zero-day-oracle',
    frame: 'glitch-link-frame',
    badge: 'oracle-sigil-badge',
    banner: 'singularity-matrix-banner', // Triggers glitch logic via theme
    accentColor: '#00f2ff',
  },
  {
    key: 'void-neural',
    name: 'Void Neural',
    theme: 'neural',
    description: 'Holographic purple glass with pulsing neural flowlines.',
    title: 'hollow-singularity',
    frame: 'spectral-neural-frame',
    badge: 'void-connect-badge',
    banner: 'data-net-banner', // Triggers neural pulse via theme
    accentColor: '#a855f7',
  },
  {
    key: 'tactical-warning',
    name: 'Tactical Warning',
    theme: 'warning',
    description: 'Heavy-plate industrial HUD with high-vis hazard stripes.',
    title: 'ghost-protocol',
    frame: 'void-lattice-frame', // To be styled with hazard stripes
    badge: 'astral-seal',
    banner: 'hazard-plate-banner',
    accentColor: '#fb923c',
  },
  {
    key: 'phosphorus-matrix',
    name: 'Phosphorus Matrix',
    theme: 'matrix',
    description: 'Retro green CRT phosphorus rain with digital scanline grain.',
    title: 'zero-day-oracle',
    frame: 'crt-terminal-frame',
    badge: 'solver-sigil',
    banner: 'phosphorus-rain-banner',
    accentColor: '#22c55e',
  },
];

export function getLoadoutDefinitions(setKey) {
  const set = PRESET_LOADOUTS.find(s => s.key === setKey);
  if (!set) return null;

  return {
    title: MARKETPLACE_ITEM_MAP.get(set.title) || null,
    frame: MARKETPLACE_ITEM_MAP.get(set.frame) || null,
    badge: MARKETPLACE_ITEM_MAP.get(set.badge) || null,
    banner: MARKETPLACE_ITEM_MAP.get(set.banner) || null,
  };
}
