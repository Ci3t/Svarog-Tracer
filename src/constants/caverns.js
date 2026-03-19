const CAVERNS = [
  {
    id: 'path_of_gelid_wind',
    legacyIds: ['c02'],
    version: '1.0',
    name: 'Path of Gelid Wind',
    location: 'Storage Zone, Herta Space Station',
    relics: ['Hunter of Glacial Forest', 'Eagle of Twilight Line'],
    relicSetIds: ['hunter-of-glacial-forest', 'eagle-of-twilight-line'],
    focus: ['Ice DMG', 'Wind DMG / Advance Forward'],
  },
  {
    id: 'path_of_jabbing_punch',
    legacyIds: ['c01'],
    version: '1.0',
    name: 'Path of Jabbing Punch',
    location: 'Silvermane Guard Restricted Zone, Jarilo-VI',
    relics: ['Champion of Streetwise Boxing', 'Thief of Shooting Meteor'],
    relicSetIds: ['champion-of-streetwise-boxing', 'thief-of-shooting-meteor'],
    focus: ['Physical DMG', 'Break Effect'],
  },
  {
    id: 'path_of_drifting',
    legacyIds: ['c03'],
    version: '1.0',
    name: 'Path of Drifting',
    location: 'Corridor of Fading Echoes, Jarilo-VI',
    relics: ['Passerby of Wandering Cloud', 'Musketeer of Wild Wheat'],
    relicSetIds: ['passerby-of-wandering-cloud', 'musketeer-of-wild-wheat'],
    focus: ['Outgoing Healing', 'ATK / SPD'],
  },
  {
    id: 'path_of_providence',
    legacyIds: ['c04'],
    version: '1.0',
    name: 'Path of Providence',
    location: 'Everwinter Hill, Jarilo-VI',
    relics: ['Genius of Brilliant Stars', 'Guard of Wuthering Snow'],
    relicSetIds: ['genius-of-brilliant-stars', 'guard-of-wuthering-snow'],
    focus: ['Quantum DMG / DEF Ignore', 'DMG Reduction / Energy'],
  },
  {
    id: 'path_of_holy_hymn',
    legacyIds: ['c05'],
    version: '1.0',
    name: 'Path of Holy Hymn',
    location: 'Cloudford, Xianzhou Luofu',
    relics: ['Band of Sizzling Thunder', 'Knight of Purity Palace'],
    relicSetIds: ['band-of-sizzling-thunder', 'knight-of-purity-palace'],
    focus: ['Lightning DMG', 'DEF / Shield Strength'],
  },
  {
    id: 'path_of_conflagration',
    legacyIds: ['c06'],
    version: '1.0',
    name: 'Path of Conflagration',
    location: 'Stargazer Navalia, Xianzhou Luofu',
    relics: ['Firesmith of Lava-Forging', 'Wastelander of Banditry Desert'],
    relicSetIds: ['firesmith-of-lava-forging', 'wastelander-of-banditry-desert'],
    focus: ['Fire DMG', 'Imaginary DMG / Crit Against Debuffed'],
  },
  {
    id: 'path_of_elixir_seekers',
    legacyIds: ['c07'],
    version: '1.2',
    name: 'Path of Elixir Seekers',
    location: 'Alchemy Commission, Xianzhou Luofu',
    relics: ['Longevous Disciple', 'Messenger Traversing Hackerspace'],
    relicSetIds: ['longevous-disciple', 'messenger-traversing-hackerspace'],
    focus: ['Max HP / Crit Rate', 'SPD / Team SPD Buff'],
  },
  {
    id: 'path_of_darkness',
    legacyIds: ['c08'],
    version: '1.5',
    name: 'Path of Darkness',
    location: 'Fyxestroll Garden, Xianzhou Luofu',
    relics: ['The Ashblazing Grand Duke', 'Prisoner in Deep Confinement'],
    relicSetIds: ['the-ashblazing-grand-duke', 'prisoner-in-deep-confinement'],
    focus: ['Follow-up DMG', 'DOT / DEF Ignore'],
  },
  {
    id: 'path_of_dreamdive',
    legacyIds: ['c09'],
    version: '2.0',
    name: 'Path of Dreamdive',
    location: 'The Reverie (Dreamscape), Penacony',
    relics: ['Pioneer Diver of Dead Waters', 'Watchmaker, Master of Dream Machinations'],
    relicSetIds: ['pioneer-diver-of-dead-waters', 'watchmaker-master-of-dream-machinations'],
    focus: ['Debuff DMG Dealer', 'Team Break Effect Buff'],
  },
  {
    id: 'path_of_cavalcade',
    legacyIds: ['c10'],
    version: '2.3',
    name: 'Path of Cavalcade',
    location: 'Penacony Paperfold University College',
    relics: ['Iron Cavalry Against the Scourge', 'The Wind-Soaring Valorous'],
    relicSetIds: ['iron-cavalry-against-the-scourge', 'the-wind-soaring-valorous'],
    focus: ['Super Break / DEF Ignore', 'FUA / Ultimate DMG'],
  },
  {
    id: 'path_of_uncertainty',
    legacyIds: ['c11'],
    version: '2.6',
    name: 'Path of Uncertainty',
    location: 'Penacony',
    relics: ["Sacerdos' Relived Ordeal", 'Scholar Lost in Erudition'],
    relicSetIds: ['sacerdos-relived-ordeal', 'scholar-lost-in-erudition'],
    focus: ['Support Buffing', 'Skill / Crit Utility'],
  },
  {
    id: 'path_of_aria',
    legacyIds: ['c12'],
    version: '3.0',
    name: 'Path of Aria',
    location: 'Amphoreus (Eternal Holy City)',
    relics: ['Hero of Triumphant Song', 'Poet of Mourning Collapse'],
    relicSetIds: ['hero-of-triumphant-song', 'poet-of-mourning-collapse'],
    focus: ['Memosprite Sync / ATK', 'Quantum DMG / SPD-Scaling Crit'],
  },
  {
    id: 'path_of_hidden_salvation',
    legacyIds: ['c13'],
    version: '3.1',
    name: 'Path of Hidden Salvation',
    location: 'Amphoreus',
    relics: ['World-Remaking Deliverer', 'Self-Enshrouded Recluse'],
    relicSetIds: ['world-remaking-deliverer', 'self-enshrouded-recluse'],
    focus: ['Break Sustain', 'Self-Buff Hybrid'],
  },
  {
    id: 'path_of_sun_thunder',
    version: '3.3',
    name: 'Path of Sun-Thunder',
    location: 'Amphoreus (Golden Port)',
    relics: ['Warrior Goddess of Sun and Thunder', 'Wavestrider Captain'],
    relicSetIds: ['warrior-goddess-of-sun-and-thunder', 'wavestrider-captain'],
    focus: ['Heal-trigger SPD/Crit', 'Skill-stacking Crit/Ult'],
  },
  {
    id: 'path_of_possession',
    legacyIds: ['c14'],
    version: '4.0',
    name: 'Path of Possession',
    location: 'Ona-Ona Islands (The Void Reef)',
    relics: ['Diviner of Distant Reach', 'Ever-Glorious Magical Girl'],
    relicSetIds: ['diviner-of-distant-reach', 'ever-glorious-magical-girl'],
    focus: ['SPD-gate Crit / Elation Aura', 'Elation DEF Ignore'],
  },
  {
    id: 'path_of_rainbow_city',
    version: '4.1 (Beta)',
    name: 'Path of Rainbow City',
    location: 'Punklorde Stage Zero (Data-Link Area)',
    relics: ['Punklorde Stage Zero', 'City of Converging Stars'],
    relicSetIds: ['punklorde-stage-zero', 'city-of-converging-stars'],
    focus: ['Elation DMG / Massive Crit DMG', 'FUA ATK Scaling / Team Crit DMG Support'],
  },
];

const byAnyId = new Map();
for (const entry of CAVERNS) {
  byAnyId.set(entry.id, entry);
  for (const legacyId of entry.legacyIds || []) {
    byAnyId.set(legacyId, entry);
  }
}

export const HSR_CAVERNS = Object.freeze(
  CAVERNS.map((entry) =>
    Object.freeze({
      ...entry,
      sets: entry.relics.join(' / '),
      relics: Object.freeze([...(entry.relics || [])]),
      relicSetIds: Object.freeze([...(entry.relicSetIds || [])]),
      focus: Object.freeze([...(entry.focus || [])]),
      legacyIds: Object.freeze([...(entry.legacyIds || [])]),
    })
  )
);

export function findCavernById(id) {
  const key = String(id || '').trim();
  if (!key) return null;
  return byAnyId.get(key) || null;
}

export function getCavernDisplayName(id) {
  const found = findCavernById(id);
  return found ? found.name : String(id || '').trim();
}

export default HSR_CAVERNS;
