import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import charactersData from '../data/characters.json';
import { HSR_CAVERNS, findCavernById } from '../constants/caverns';
import { useAuth } from '../hooks/useAuth';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import { buildApiUrl as buildZoneApiUrl } from '../utils/apiBase';

// --- Constants & Helpers ---
export const SERVER_REGION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'asia', label: 'Asia' },
  { value: 'europe', label: 'EU' },
  { value: 'america', label: 'NA' },
];

export const SERVER_REGION_SUBMIT_OPTIONS = SERVER_REGION_OPTIONS.filter((region) => region.value !== 'all');

export const OUTCOME_OPTIONS = [
  { value: 'spd-double-crit', label: 'SPD + CR + CD', color: 'indigo' },
  { value: 'double-crit', label: 'CR + CD only', color: 'emerald' },
  { value: 'spd-one-crit', label: 'SPD + one crit', color: 'cyan' },
  { value: 'one-crit', label: 'One crit only', color: 'blue' },
  { value: 'effect-junk', label: 'Effect junk', color: 'amber' },
  { value: 'flat-junk', label: 'Flat junk', color: 'slate' },
  { value: 'mixed', label: 'Mixed', color: 'slate' },
];

export const MAP_TARGET_PRESET_OPTIONS = [
  { value: 'crit_potential', label: 'Crit Pot' },
  { value: 'crit_substats', label: 'Crit Stats' },
  { value: 'spd', label: 'SPD' },
  { value: 'hp_pct', label: 'HP%' },
  { value: 'break_effect', label: 'Break' },
  { value: 'spd_crit', label: 'SPD + Crit' },
  { value: 'custom', label: 'Custom' },
];

export const MAP_TARGET_CUSTOM_MAX_STATS = 4;
export const RELIC_CARD_PIECES = ['Head', 'Hands', 'Body', 'Feet', 'Orb', 'Rope'];
export const RELIC_SUBSTAT_OPTIONS = ['Flat HP', 'Flat ATK', 'Flat DEF', 'HP%', 'ATK%', 'DEF%', 'SPD', 'CRIT Rate', 'CRIT DMG', 'Effect Hit Rate', 'Effect RES', 'Break Effect'];
export const RELIC_MAIN_STAT_OPTIONS_BY_PIECE = Object.freeze({
  Head: ['Flat HP'],
  Hands: ['Flat ATK'],
  Body: ['CRIT Rate', 'CRIT DMG', 'Outgoing Healing Boost', 'Effect Hit Rate', 'ATK%', 'DEF%', 'HP%'],
  Feet: ['SPD', 'ATK%', 'DEF%', 'HP%', 'Break Effect'],
  Orb: ['Physical DMG', 'Fire DMG', 'Ice DMG', 'Wind DMG', 'Lightning DMG', 'Quantum DMG', 'Imaginary DMG', 'ATK%', 'DEF%', 'HP%'],
  Rope: ['Energy Regeneration Rate', 'Break Effect', 'ATK%', 'DEF%', 'HP%'],
});
export const RELIC_FIXED_MAIN_STATS = Object.freeze({
  Head: 'Flat HP',
  Hands: 'Flat ATK',
});

export function getMainStatOptionsForPiece(piece) {
  return RELIC_MAIN_STAT_OPTIONS_BY_PIECE[piece] || [];
}

export function getDefaultMainStatForPiece(piece) {
  return RELIC_FIXED_MAIN_STATS[piece] || null;
}

export function buildEmptyRelicCard(index) {
  const piece = 'Head';
  return {
    index,
    piece,
    mainStat: getDefaultMainStatForPiece(piece),
    substats: [],
  };
}

export function inferOutcomeFromRelics(relicCards) {
  const cards = Array.isArray(relicCards) ? relicCards : [];
  if (cards.length === 0) return 'mixed';

  const totalRelics = cards.length;
  let critOnlyCount = 0;
  let speedAndCritCount = 0;
  let oneCritCount = 0;
  let junkCount = 0;

  for (const card of cards) {
    const substats = Array.isArray(card.substats) ? card.substats : [];
    const hasCr = substats.includes('CRIT Rate');
    const hasCd = substats.includes('CRIT DMG');
    const hasSpd = substats.includes('SPD');
    const hasAnyCrit = hasCr || hasCd;

    if (hasSpd && hasCr && hasCd) {
      speedAndCritCount += 1;
    } else if (hasCr && hasCd) {
      critOnlyCount += 1;
    } else if (hasSpd && hasAnyCrit) {
      oneCritCount += 1;
    } else if (!hasAnyCrit) {
      const junkLike = substats.filter((stat) => ['Flat HP', 'Flat ATK', 'Flat DEF', 'Effect RES'].includes(stat)).length;
      if (junkLike >= 2) {
        junkCount += 1;
      }
    }
  }

  if (speedAndCritCount / totalRelics >= 0.4) return 'spd-double-crit';
  if (critOnlyCount / totalRelics >= 0.4) return 'double-crit';
  if (oneCritCount / totalRelics >= 0.4) return 'spd-one-crit';

  const anyCrit = speedAndCritCount + critOnlyCount + oneCritCount;
  if (anyCrit / totalRelics >= 0.4) return 'one-crit';
  if (junkCount / totalRelics >= 0.5) return 'flat-junk';

  return 'mixed';
}

export function formatRate(rate) {
  if (rate === null || rate === undefined) return '--';
  return `${Math.round(Number(rate) * 100)}%`;
}

export function formatDropScore(score) {
  if (score === null || score === undefined) return '--';
  return `${Math.round(Number(score) * 100)}%`;
}

const CLIENT_SUBSTAT_CANONICAL_MAP = new Map([
  ['flat hp', 'Flat HP'],
  ['hp flat', 'Flat HP'],
  ['flat atk', 'Flat ATK'],
  ['atk flat', 'Flat ATK'],
  ['flat def', 'Flat DEF'],
  ['def flat', 'Flat DEF'],
  ['hp%', 'HP%'],
  ['hp pct', 'HP%'],
  ['hp percent', 'HP%'],
  ['atk%', 'ATK%'],
  ['atk pct', 'ATK%'],
  ['atk percent', 'ATK%'],
  ['def%', 'DEF%'],
  ['def pct', 'DEF%'],
  ['def percent', 'DEF%'],
  ['spd', 'SPD'],
  ['speed', 'SPD'],
  ['crit rate', 'CRIT Rate'],
  ['crit_rate', 'CRIT Rate'],
  ['critrate', 'CRIT Rate'],
  ['crit dmg', 'CRIT DMG'],
  ['crit damage', 'CRIT DMG'],
  ['crit_dmg', 'CRIT DMG'],
  ['critdmg', 'CRIT DMG'],
  ['effect hit rate', 'Effect Hit Rate'],
  ['effect hit', 'Effect Hit Rate'],
  ['ehr', 'Effect Hit Rate'],
  ['effect res', 'Effect RES'],
  ['effect resist', 'Effect RES'],
  ['effect resistance', 'Effect RES'],
  ['break effect', 'Break Effect'],
  ['break', 'Break Effect'],
]);

function normalizeClientSubstatLabel(value) {
  const raw = typeof value === 'object' && value
    ? String(value.name || value.stat || value.key || value.label || value.substat || '').trim()
    : String(value || '').trim();
  if (!raw) return '';
  const lowered = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  return CLIENT_SUBSTAT_CANONICAL_MAP.get(lowered) || raw;
}

function collectZoneSubstatsForClient(zone) {
  const substats = [];
  if (Array.isArray(zone?.aggregated_substats)) {
    for (const entry of zone.aggregated_substats) {
      const normalized = normalizeClientSubstatLabel(entry);
      if (normalized) substats.push(normalized);
    }
  }
  const relics = Array.isArray(zone?.sample_relic_data?.relics)
    ? zone.sample_relic_data.relics
    : Array.isArray(zone?.relic_data?.relics)
      ? zone.relic_data.relics
      : [];
  for (const relic of relics) {
    const entries = Array.isArray(relic?.substats) ? relic.substats : [];
    for (const entry of entries) {
      const normalized = normalizeClientSubstatLabel(entry);
      if (normalized) substats.push(normalized);
    }
  }
  return substats;
}

function applyClientTargetFilter(zones, preset, customStats, matchMode) {
  const presetKey = String(preset || 'crit_potential');
  const presetStats = presetKey === 'crit_substats'
    ? ['CRIT Rate', 'CRIT DMG']
    : presetKey === 'spd'
      ? ['SPD']
      : presetKey === 'hp_pct'
        ? ['HP%']
        : presetKey === 'break_effect'
          ? ['Break Effect']
          : presetKey === 'spd_crit'
            ? ['SPD', 'CRIT Rate', 'CRIT DMG']
            : presetKey === 'custom'
              ? (Array.isArray(customStats) ? customStats : [])
              : [];

  const targetStats = Array.from(new Set(presetStats.map((entry) => normalizeClientSubstatLabel(entry)).filter(Boolean)));
  if (targetStats.length === 0) {
    return Array.isArray(zones) ? zones : [];
  }

  const mode = String(matchMode || 'any').toLowerCase() === 'all' ? 'all' : 'any';

  return (Array.isArray(zones) ? zones : [])
    .map((zone) => {
      const substats = collectZoneSubstatsForClient(zone);
      const totalEntries = substats.length;
      const countMap = new Map();
      for (const stat of substats) {
        const key = normalizeClientSubstatLabel(stat);
        if (!key) continue;
        countMap.set(key, (countMap.get(key) || 0) + 1);
      }
      const matchedStats = targetStats.filter((stat) => (countMap.get(stat) || 0) > 0);
      const totalMatches = targetStats.reduce((sum, stat) => sum + (countMap.get(stat) || 0), 0);
      const passes = mode === 'all'
        ? matchedStats.length === targetStats.length
        : matchedStats.length > 0;
      const targetRate = totalEntries > 0 ? Number((totalMatches / totalEntries).toFixed(4)) : null;
      return {
        ...zone,
        target_rate: targetRate,
        target_match_count: totalMatches,
        target_matched_stats: matchedStats,
        target_passes: passes,
      };
    })
    .filter((zone) => zone.target_passes)
    .sort((a, b) => {
      if ((b.target_rate ?? -1) !== (a.target_rate ?? -1)) return (b.target_rate ?? -1) - (a.target_rate ?? -1);
      if ((b.target_match_count ?? 0) !== (a.target_match_count ?? 0)) return (b.target_match_count ?? 0) - (a.target_match_count ?? 0);
      if ((b.crit_rate ?? -1) !== (a.crit_rate ?? -1)) return (b.crit_rate ?? -1) - (a.crit_rate ?? -1);
      return (b.runs ?? 0) - (a.runs ?? 0);
    });
}

export function parseClearTimeToSeconds(value) {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const numeric = Number(raw);
    return Number.isFinite(numeric) && numeric > 0 ? Number(numeric.toFixed(3)) : null;
  }
  const parts = raw.split(':').map((entry) => entry.trim());
  if (parts.length !== 2 && parts.length !== 3) return null;
  const nums = parts.map((entry) => Number(entry));
  if (nums.some((num) => !Number.isFinite(num) || num < 0)) return null;
  let seconds = 0;
  if (parts.length === 2) {
    const [minutes, secs] = nums;
    if (secs >= 60) return null;
    seconds = minutes * 60 + secs;
  } else {
    const [hours, minutes, secs] = nums;
    if (minutes >= 60 || secs >= 60) return null;
    seconds = hours * 3600 + minutes * 60 + secs;
  }
  return seconds > 0 ? Number(seconds.toFixed(3)) : null;
}

export function sanitizeClearTimeMmSsInput(value) {
  const raw = String(value || '').replace(/[^\d:]/g, '');
  const parts = raw.split(':');
  let minutes = (parts[0] || '').slice(0, 2);
  let secondsRaw = parts.length > 1 ? parts.slice(1).join('') : '';
  let seconds = secondsRaw.slice(0, 2);
  if (seconds.length === 2 && parseInt(seconds, 10) >= 60) {
    seconds = '59';
  }
  return secondsRaw.length > 0 || raw.includes(':') ? `${minutes}:${seconds}` : minutes;
}

export function normalizeClearTimeMmSsInput(value) {
  const parsed = parseClearTimeToSeconds(value);
  if (parsed === null) return String(value || '').trim();
  const totalSeconds = Math.round(parsed);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function resolveAuthDisplayName(user) {
  if (!user || typeof user !== 'object') return null;
  const metadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discordIdentity = identities.find((identity) => {
    const provider = String(identity?.provider || identity?.identity_provider || '').toLowerCase();
    return provider === 'discord';
  });
  const identityData = discordIdentity && typeof discordIdentity.identity_data === 'object'
    ? discordIdentity.identity_data
    : {};
  const picks = [
    metadata.global_name,
    metadata.full_name,
    identityData.global_name,
    metadata.user_name,
    identityData.username,
    metadata.preferred_username,
    metadata.name,
    user.email,
    user.id,
  ];
  for (const value of picks) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return null;
}

export function mapAuthError(error) {
  if (!error) return 'Unknown error';
  if (error.message?.includes('401')) return 'Authentication required. Please sign in again.';
  return error.message || 'Request failed';
}

export function findNextEmptySlot(slotsArray, startIndex = 0) {
  for (let i = 0; i < 4; i++) {
    const idx = (startIndex + i) % 4;
    if (!slotsArray[idx]) return idx;
  }
  return 0;
}

export function parseNonNegativeInteger(value, { max = null } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  if (max !== null && parsed > max) return max;
  return parsed;
}

export function buildZoneVariantKey(zone) {
  const explicit = String(zone?.xor_slot_key || '').trim();
  if (explicit) return explicit;
  const xor = parseNonNegativeInteger(zone?.char_xor, { max: 99999 });
  const slot = parseNonNegativeInteger(zone?.char_slot, { max: 99999 });
  const sum = parseNonNegativeInteger(zone?.char_sum, { max: 99999 });
  if (xor === null || slot === null) return '';
  return String(xor) + ':' + String(slot) + ':' + String(sum === null ? 'na' : sum);
}

function extractOwnedCharacterIdsFromImport(payload) {
  const sources = [];
  if (Array.isArray(payload?.characters)) {
    sources.push(payload.characters);
  }
  if (Array.isArray(payload?.avatars)) {
    sources.push(payload.avatars);
  }
  if (Array.isArray(payload?.roster)) {
    sources.push(payload.roster);
  }

  const ids = [];
  for (const source of sources) {
    for (const entry of source) {
      const candidate = Number(
        entry?.id ??
        entry?.character_id ??
        entry?.characterId ??
        entry?.avatar_id ??
        entry?.avatarId ??
        entry?.numId
      );
      if (Number.isInteger(candidate) && candidate > 0 && charactersData.some((character) => Number(character?.numId) === candidate)) {
        ids.push(candidate);
      }
    }
  }

  return Array.from(new Set(ids)).sort((a, b) => a - b);
}

// --- Hook Component ---
export function useZoneTracker(sessionTheme = 'modern') {
  const { user, getAuthHeader, roleMode } = useAuth();
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const rootThemeClass = themeConfig.rootClassName || 'modern-theme';

  const [slots, setSlots] = useState([null, null, null, null]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState(null);
  
  const [cavern, setCavern] = useState('');
  const [serverRegion, setServerRegion] = useState('asia');
  const [notes, setNotes] = useState('');
  const [relicDropCount, setRelicDropCount] = useState(7);
  const [relicCards, setRelicCards] = useState(() => Array.from({ length: 7 }, (_, index) => buildEmptyRelicCard(index + 1)));
  const [relicGridCompact, setRelicGridCompact] = useState(false);
  const [flagNotes, setFlagNotes] = useState('');
  const [clearTimeInput, setClearTimeInput] = useState('');
  const [workspaceView, setWorkspaceView] = useState('logger');

  const [requestedEpoch, setRequestedEpoch] = useState('current');
  const [mapData, setMapData] = useState(null);
  const [mapRegion, setMapRegion] = useState('all');
  const [mapTargetPreset, setMapTargetPreset] = useState('crit_potential');
  const [mapTargetMode, setMapTargetMode] = useState('any');
  const [mapTargetCustomStats, setMapTargetCustomStats] = useState(['SPD']);
  const [zoneCardView, setZoneCardView] = useState('grid');
  const [showMapFilters, setShowMapFilters] = useState(false);
  const [showTuner, setShowTuner] = useState(false);

  const [loadingMap, setLoadingMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flagging, setFlagging] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [charSearchTerm, setCharSearchTerm] = useState('');

  const [ownedCharIds, setOwnedCharIds] = useState([]);
  const [ownedSearchTerm, setOwnedSearchTerm] = useState('');
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedSaving, setOwnedSaving] = useState(false);
  const [ownedImporting, setOwnedImporting] = useState(false);
  const [rosterMode, setRosterMode] = useState('team');

  const [variantOwnershipFilter, setVariantOwnershipFilter] = useState('all');
  const [variantMinOwned, setVariantMinOwned] = useState(3);
  const [variantEnforceSum, setVariantEnforceSum] = useState(true);
  const [variantsByZone, setVariantsByZone] = useState({});
  const [variantLoadingZoneKey, setVariantLoadingZoneKey] = useState('');
  const [exportingDebug, setExportingDebug] = useState(false);
  const [adminEligible, setAdminEligible] = useState(false);
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);
  const [adminStatusLoading, setAdminStatusLoading] = useState(false);
  const [adminActionLoadingKey, setAdminActionLoadingKey] = useState('');
  const [adminWipeLoading, setAdminWipeLoading] = useState(false);
  const [showAdminWipeAllModal, setShowAdminWipeAllModal] = useState(false);
  const [adminWipeAllConfirmText, setAdminWipeAllConfirmText] = useState('');
  const [adminEditModalZone, setAdminEditModalZone] = useState(null);
  const [adminEditDraft, setAdminEditDraft] = useState({ xor: '', slot: '', sum: '', slotOrder: ['', '', '', ''] });

  const [tuneXorInput, setTuneXorInput] = useState('');
  const [tuneSlotInput, setTuneSlotInput] = useState('');
  const [tuneSumInput, setTuneSumInput] = useState('');
  const [tunedZones, setTunedZones] = useState([]);
  const [manualVariantPayload, setManualVariantPayload] = useState(null);
  const [manualVariantLoading, setManualVariantLoading] = useState(false);

  // Build Team workspace state
  const [buildSlots, setBuildSlots] = useState([null, null, null, null]);
  const [buildVariantPayload, setBuildVariantPayload] = useState(null);
  const [buildVariantLoading, setBuildVariantLoading] = useState(false);

  const mapRef = useRef(null);
  const formRef = useRef(null);
  const tunerRef = useRef(null);

  const charactersByNumId = useMemo(() => {
    return new Map((Array.isArray(charactersData) ? charactersData : []).map((entry) => [Number(entry.numId), entry]));
  }, []);
  const authDisplayName = useMemo(() => resolveAuthDisplayName(user), [user]);

  const characterOptions = useMemo(() => {
    let list = [...(Array.isArray(charactersData) ? charactersData : [])];
    if (charSearchTerm) {
      const term = charSearchTerm.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(term) || 
        String(c.numId).includes(term)
      );
    }
    return list.sort((a, b) => {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [charSearchTerm]);

  const ownedOptions = useMemo(() => {
    let list = [...(Array.isArray(charactersData) ? charactersData : [])];
    if (ownedSearchTerm) {
      const term = ownedSearchTerm.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(term) ||
        String(c.numId).includes(term)
      );
    }
    return list.sort((a, b) => {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [ownedSearchTerm]);

  const ownedSet = useMemo(() => new Set(ownedCharIds.map((id) => Number(id))), [ownedCharIds]);

  const relicSubstatFrequency = useMemo(() => {
    const frequency = {};
    for (const stat of RELIC_SUBSTAT_OPTIONS) {
      frequency[stat] = 0;
    }
    for (const card of relicCards) {
      for (const stat of card.substats || []) {
        frequency[stat] = (frequency[stat] || 0) + 1;
      }
    }
    return frequency;
  }, [relicCards]);

  const suggestedOutcome = useMemo(() => inferOutcomeFromRelics(relicCards), [relicCards]);

  const fetchMap = useCallback(
    async (epoch = 'current') => {
      setLoadingMap(true);
      setError('');
      try {
        const buildMapParams = ({ includeTarget = true } = {}) => {
          const params = new URLSearchParams({
            epoch: String(epoch),
            region: String(mapRegion),
          });
          if (includeTarget && mapTargetPreset !== 'crit_potential') {
            params.set('target', mapTargetPreset);
            if (mapTargetPreset === 'custom') {
              params.set('stats', mapTargetCustomStats.join(','));
              params.set('match_mode', mapTargetMode);
            }
          }
          return params;
        };

        const requestMap = async ({ includeTarget = true } = {}) => {
          const response = await fetch(buildZoneApiUrl(`/api/zone/map?${buildMapParams({ includeTarget }).toString()}`), {
            method: 'GET',
            headers: { ...getAuthHeader() },
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload.error || `HTTP ${response.status}`);
          }
          return payload;
        };

        let payload = await requestMap({ includeTarget: true });

        if (mapTargetPreset !== 'crit_potential') {
          const rawPayload = await requestMap({ includeTarget: false });
          payload = {
            ...payload,
            total_runs: rawPayload?.total_runs ?? payload?.total_runs ?? 0,
            epoch_summary: rawPayload?.epoch_summary ?? payload?.epoch_summary,
            target_filter: payload?.target_filter ?? rawPayload?.target_filter,
            zones: applyClientTargetFilter(rawPayload?.zones, mapTargetPreset, mapTargetCustomStats, mapTargetMode),
          };
        }

        setMapData(payload);
        
        const zoneCards = mapRef.current?.querySelectorAll('.zone-card');
        if (zoneCards && zoneCards.length > 0) {
          gsap.fromTo(zoneCards,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power2.out' }
          );
        }
      } catch (mapError) {
        setError(mapAuthError(mapError));
      } finally {
        setLoadingMap(false);
      }
    },
    [getAuthHeader, mapRegion, mapTargetCustomStats, mapTargetMode, mapTargetPreset]
  );

  const loadOwnedRoster = useCallback(async () => {
    if (!user?.id) {
      setOwnedCharIds([]);
      setOwnedLoading(false);
      return;
    }
    setOwnedLoading(true);
    try {
      const response = await fetch(buildZoneApiUrl('/api/zone/owned'), {
        method: 'GET',
        headers: { ...getAuthHeader() },
      });
      if (response.status === 404) {
        setOwnedCharIds([]);
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      setOwnedCharIds(Array.isArray(payload.owned_char_ids) ? payload.owned_char_ids.map(Number) : []);
    } catch (ownedError) {
      setError(mapAuthError(ownedError));
    } finally {
      setOwnedLoading(false);
    }
  }, [getAuthHeader, user?.id]);

  const persistOwnedRoster = useCallback(async (nextOwnedCharIds, successMessage = 'Owned roster saved.') => {
    if (!user?.id) {
      throw new Error('Sign in to save your owned roster.');
    }

    const normalizedOwned = Array.from(
      new Set(
        (Array.isArray(nextOwnedCharIds) ? nextOwnedCharIds : [])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && charactersByNumId.has(value))
      )
    ).sort((a, b) => a - b);

    const response = await fetch(buildZoneApiUrl('/api/zone/owned'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ owned_char_ids: normalizedOwned }),
    });
    if (response.status === 404) {
      throw new Error('Owned roster API is not available. Run backend API (npx vercel dev).');
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    const persisted = Array.isArray(payload.owned_char_ids) ? payload.owned_char_ids.map(Number) : normalizedOwned;
    setOwnedCharIds(persisted);
    setSuccess(successMessage);
    return persisted;
  }, [charactersByNumId, getAuthHeader, user?.id]);

  const saveOwnedRoster = useCallback(async () => {
    setOwnedSaving(true);
    try {
      await persistOwnedRoster(ownedCharIds, 'Owned roster saved.');
    } catch (ownedError) {
      setError(mapAuthError(ownedError));
    } finally {
      setOwnedSaving(false);
    }
  }, [ownedCharIds, persistOwnedRoster]);

  const importOwnedRosterFile = useCallback(async (file) => {
    if (!file) return;
    setOwnedImporting(true);
    setError('');
    setSuccess('');
    try {
      const rawText = await file.text();
      const payload = JSON.parse(rawText);
      const importedIds = extractOwnedCharacterIdsFromImport(payload).filter((value) => charactersByNumId.has(value));
      if (importedIds.length === 0) {
        throw new Error('No supported characters were found in that Reliquary export.');
      }
      await persistOwnedRoster(importedIds, `Imported ${importedIds.length} owned characters from ${file.name}.`);
    } catch (importError) {
      setError(mapAuthError(importError));
    } finally {
      setOwnedImporting(false);
    }
  }, [charactersByNumId, persistOwnedRoster]);

  const toggleOwnedCharacter = useCallback((charId) => {
    const normalized = Number(charId);
    setOwnedCharIds((prev) => {
      if (prev.includes(normalized)) {
        return prev.filter((value) => value !== normalized);
      }
      return [...prev, normalized].sort((a, b) => a - b);
    });
  }, []);

  const toggleMapTargetCustomStat = useCallback((stat) => {
    setMapTargetCustomStats((prev) => {
      if (prev.includes(stat)) {
        if (prev.length === 1) return prev;
        return prev.filter((entry) => entry !== stat);
      }
      if (prev.length >= MAP_TARGET_CUSTOM_MAX_STATS) {
        return [...prev.slice(1), stat];
      }
      return [...prev, stat];
    });
  }, []);

  const fetchVariantsForZone = useCallback(async (zone) => {
    const zoneKey = buildZoneVariantKey(zone);
    if (!zoneKey) return;
    setVariantLoadingZoneKey(zoneKey);
    const useOwnedFilter = variantOwnershipFilter === 'owned';
    const minOwned = useOwnedFilter ? variantMinOwned : 0;
    try {
      const params = new URLSearchParams({
        xor: String(zone.char_xor),
        slot: String(zone.char_slot),
        sum: String(zone.char_sum),
        epoch: requestedEpoch,
        min_owned: String(minOwned),
        enforce_sum: variantEnforceSum ? 'true' : 'false',
        use_owned: useOwnedFilter ? 'true' : 'false',
        limit: '12',
      });
      const response = await fetch(buildZoneApiUrl(`/api/zone/variants?${params.toString()}`), {
        method: 'GET',
        headers: { ...getAuthHeader() },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detailsText = typeof payload.details === 'string'
          ? payload.details
          : payload.details?.message || payload.details?.hint || '';
        const baseError = payload.error || `HTTP ${response.status}`;
        throw new Error(detailsText ? baseError + ': ' + detailsText : baseError);
      }
      setVariantsByZone((prev) => ({ ...prev, [zoneKey]: payload }));
      if (payload?.ownership?.warning === 'owned_roster_table_missing') {
        setSuccess('Owned roster table is not ready yet.');
      } else if (payload?.ownership?.warning === 'owned_roster_empty') {
        setSuccess('Owned roster is empty. Save your owned characters first.');
      }
    } catch (variantError) {
      setError(mapAuthError(variantError));
    } finally {
      setVariantLoadingZoneKey('');
    }
  }, [getAuthHeader, requestedEpoch, variantMinOwned, variantOwnershipFilter, variantEnforceSum]);

  const handleTuneFromZone = useCallback((zone) => {
    if (!zone) return;
    setTuneXorInput(String(zone.char_xor ?? ''));
    setTuneSlotInput(String(zone.char_slot ?? ''));
    setTuneSumInput(String(zone.char_sum ?? ''));
    setSuccess(`Tune target loaded: Zone ${zone.char_xor} / Slot ${zone.char_slot}.`);
    setError('');
    if (tunerRef.current) {
      tunerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      gsap.fromTo(
        tunerRef.current,
        { borderColor: 'rgba(51, 65, 85, 0.6)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
        { borderColor: 'rgba(34, 211, 238, 0.5)', boxShadow: '0 0 24px rgba(34, 211, 238, 0.2)', duration: 0.4, yoyo: true, repeat: 1, ease: 'power2.out' }
      );
    }
  }, []);

  const handleFindTunedZones = useCallback(() => {
    setError('');
    setSuccess('');
    setManualVariantPayload(null);
    const targetXor = parseNonNegativeInteger(tuneXorInput, { max: 99999 });
    if (targetXor === null) {
      setError('Enter a valid XOR target to scan zones.');
      return;
    }
    const targetSlot = parseNonNegativeInteger(tuneSlotInput, { max: 9999 });
    if (String(tuneSlotInput || '').trim() && targetSlot === null) {
      setError('Slot must be a valid number (0-9999) when provided.');
      return;
    }
    const targetSum = parseNonNegativeInteger(tuneSumInput, { max: 99999 });
    if (variantEnforceSum && String(tuneSumInput || '').trim() && targetSum === null) {
      setError('Sum must be a valid number when Sum Lock is enabled.');
      return;
    }
    const smartXorRange = targetSlot !== null ? 12 : 24;
    const smartSlotRange = targetSlot !== null ? 80 : 0;
    const candidateZones = Array.isArray(mapData?.zones) ? mapData.zones : [];
    const matched = candidateZones
      .filter((zone) => {
        const xorDiff = Math.abs(Number(zone.char_xor) - targetXor);
        if (xorDiff > smartXorRange) return false;
        if (targetSlot !== null) {
          const slotDiff = Math.abs(Number(zone.char_slot) - targetSlot);
          if (slotDiff > smartSlotRange) return false;
        }
        if (variantEnforceSum && targetSum !== null && Number(zone.char_sum) !== targetSum) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aDiff = Math.abs(Number(a.char_xor) - targetXor) + (targetSlot !== null ? Math.abs(Number(a.char_slot) - targetSlot) : 0);
        const bDiff = Math.abs(Number(b.char_xor) - targetXor) + (targetSlot !== null ? Math.abs(Number(b.char_slot) - targetSlot) : 0);
        if (aDiff !== bDiff) return aDiff - bDiff;
        if ((b.crit_rate || 0) !== (a.crit_rate || 0)) return (b.crit_rate || 0) - (a.crit_rate || 0);
        return (b.runs || 0) - (a.runs || 0);
      })
      .slice(0, 24);
    setTunedZones(matched);
    setSuccess(`Found ${matched.length} zone suggestion(s) near Zone ${targetXor}${targetSlot !== null ? ' / Slot ' + targetSlot : ''}.`);
  }, [mapData, tuneSlotInput, tuneSumInput, tuneXorInput, variantEnforceSum]);

  const handleGenerateManualVariants = useCallback(async () => {
    setError('');
    setSuccess('');
    const targetXor = parseNonNegativeInteger(tuneXorInput, { max: 99999 });
    const targetSlot = parseNonNegativeInteger(tuneSlotInput, { max: 9999 });
    const targetSum = parseNonNegativeInteger(tuneSumInput, { max: 99999 });
    if (targetXor === null || targetSlot === null) {
      setError('Manual variant generation requires both XOR and SLOT.');
      return;
    }
    if (variantEnforceSum && String(tuneSumInput || '').trim() && targetSum === null) {
      setError('Sum must be valid when Sum Lock is enabled.');
      return;
    }
    const useOwnedFilter = variantOwnershipFilter === 'owned';
    const minOwned = useOwnedFilter ? variantMinOwned : 0;
    setManualVariantLoading(true);
    try {
      const params = new URLSearchParams({
        xor: String(targetXor),
        slot: String(targetSlot),
        epoch: requestedEpoch,
        min_owned: String(minOwned),
        enforce_sum: variantEnforceSum ? 'true' : 'false',
        use_owned: useOwnedFilter ? 'true' : 'false',
        limit: '20',
      });
      if (targetSum !== null) params.set('sum', String(targetSum));
      const response = await fetch(buildZoneApiUrl(`/api/zone/variants?${params.toString()}`), {
        method: 'GET',
        headers: { ...getAuthHeader() },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setManualVariantPayload(payload);
      if (payload?.ownership?.warning === 'owned_roster_empty') {
        setSuccess('Owned roster is empty. Save your owned characters first.');
      } else if (payload?.ownership?.warning === 'owned_roster_table_missing') {
        setSuccess('Owned roster table is not ready yet.');
      } else {
        setSuccess(`Generated ${Array.isArray(payload?.variants) ? payload.variants.length : 0} manual variant(s).`);
      }
    } catch (manualError) {
      setError(mapAuthError(manualError));
    } finally {
      setManualVariantLoading(false);
    }
  }, [getAuthHeader, requestedEpoch, tuneSlotInput, tuneSumInput, tuneXorInput, variantEnforceSum, variantMinOwned, variantOwnershipFilter]);

  useEffect(() => {
    fetchMap(requestedEpoch);
  }, [fetchMap, requestedEpoch]);

  useEffect(() => {
    setTunedZones([]);
    setManualVariantPayload(null);
  }, [requestedEpoch, mapRegion, mapTargetCustomStats, mapTargetMode, mapTargetPreset]);

  useEffect(() => {
    loadOwnedRoster();
  }, [loadOwnedRoster]);

  useEffect(() => {
    let isMounted = true;
    const fetchAdminStatus = async () => {
      setAdminStatusLoading(true);
      try {
        const response = await fetch(buildZoneApiUrl('/api/zone/export?status=true'), {
          method: 'GET',
          headers: { ...getAuthHeader() },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json().catch(() => ({}));
        if (!isMounted) return;
        const allowed = Boolean(payload?.is_admin);
        setAdminEligible(allowed);
        if (!allowed) setAdminModeEnabled(false);
      } catch {
        if (!isMounted) return;
        setAdminEligible(false);
        setAdminModeEnabled(false);
      } finally {
        if (isMounted) setAdminStatusLoading(false);
      }
    };
    fetchAdminStatus();
    return () => { isMounted = false; };
  }, [getAuthHeader]);

  useEffect(() => {
    if (!adminEligible) {
      setAdminModeEnabled(false);
      return;
    }
    setAdminModeEnabled(roleMode === 'admin');
  }, [adminEligible, roleMode]);

  useEffect(() => {
    const header = document.querySelector('.page-header');
    if (!header) return;
    gsap.fromTo(header, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
  }, []);

  const slotSummary = useMemo(() => {
    return slots.map((charId) => (charId ? charactersByNumId.get(Number(charId))?.name || `#${charId}` : 'Empty')).join(' / ');
  }, [charactersByNumId, slots]);

  const currentTeamSignature = useMemo(() => {
    const numeric = slots.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
    if (numeric.length !== 4) return null;
    return numeric.reduce((total, value) => total + value, 0);
  }, [slots]);

  const buildTeamSignature = useMemo(() => {
    const numeric = buildSlots.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
    if (numeric.length !== 4) return null;
    const [a, b, c, d] = numeric;
    return {
      xor: a ^ b ^ c ^ d,
      slot: (d * 3 + a + b + c) % 10000,
      sum: a + b + c + d,
      xorSlotKey: `${a ^ b ^ c ^ d}_${(d * 3 + a + b + c) % 10000}`,
    };
  }, [buildSlots]);

  useEffect(() => {
    const safeCount = Math.min(12, Math.max(1, Number(relicDropCount) || 1));
    setRelicDropCount(safeCount);
    setRelicCards((prev) => {
      const next = [];
      for (let i = 0; i < safeCount; i += 1) {
        const existing = prev[i];
        if (!existing) {
          next.push(buildEmptyRelicCard(i + 1));
          continue;
        }
        const piece = RELIC_CARD_PIECES.includes(existing.piece) ? existing.piece : 'Head';
        const allowedMainStats = getMainStatOptionsForPiece(piece);
        const defaultMainStat = getDefaultMainStatForPiece(piece);
        const mainStat = allowedMainStats.includes(existing.mainStat) ? existing.mainStat : defaultMainStat;
        const substats = Array.isArray(existing.substats)
          ? existing.substats.filter((substat) => !mainStat || substat !== mainStat).slice(0, 4)
          : [];
        next.push({ index: i + 1, piece, mainStat, substats });
      }
      return next;
    });
  }, [relicDropCount]);

  const cycleRelicPiece = useCallback((cardIndex) => {
    setRelicCards((prev) => prev.map((card, index) => {
      if (index !== cardIndex) return card;
      const currentIndex = RELIC_CARD_PIECES.indexOf(card.piece);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % RELIC_CARD_PIECES.length : 0;
      const nextPiece = RELIC_CARD_PIECES[nextIndex];
      const allowedMainStats = getMainStatOptionsForPiece(nextPiece);
      const defaultMainStat = getDefaultMainStatForPiece(nextPiece);
      const nextMainStat = allowedMainStats.includes(card.mainStat) ? card.mainStat : defaultMainStat;
      return {
        ...card,
        piece: nextPiece,
        mainStat: nextMainStat,
        substats: (card.substats || []).filter((substat) => !nextMainStat || substat !== nextMainStat),
      };
    }));
  }, []);

  const setRelicCardMainStat = useCallback((cardIndex, nextMainStatRaw) => {
    setRelicCards((prev) => prev.map((card, index) => {
      if (index !== cardIndex) return card;
      const fixedMainStat = RELIC_FIXED_MAIN_STATS[card.piece] || null;
      const allowedMainStats = getMainStatOptionsForPiece(card.piece);
      const nextMainStat = fixedMainStat || (allowedMainStats.includes(nextMainStatRaw) ? nextMainStatRaw : null);
      return {
        ...card,
        mainStat: nextMainStat,
        substats: (card.substats || []).filter((substat) => !nextMainStat || substat !== nextMainStat),
      };
    }));
  }, []);

  const toggleRelicCardSubstat = useCallback((cardIndex, substat) => {
    setRelicCards((prev) => prev.map((card, index) => {
      if (index !== cardIndex) return card;
      if (card.mainStat && card.mainStat === substat) return card;
      if (card.substats.includes(substat)) {
        return { ...card, substats: card.substats.filter((value) => value !== substat) };
      }
      if (card.substats.length >= 4) return card;
      return { ...card, substats: [...card.substats, substat] };
    }));
  }, []);

  const assignCharacterToSlot = useCallback((charId, targetSlotIndex) => {
    let nextActiveSlot = targetSlotIndex;
    setSlots((prev) => {
      const next = [...prev];
      const normalizedCharId = Number(charId);
      const existingIndex = next.indexOf(normalizedCharId);
      if (existingIndex === targetSlotIndex) return prev;
      if (existingIndex !== -1) {
        if (next[targetSlotIndex]) {
          next[existingIndex] = next[targetSlotIndex];
          next[targetSlotIndex] = normalizedCharId;
        } else {
          next[existingIndex] = null;
          next[targetSlotIndex] = normalizedCharId;
        }
      } else {
        next[targetSlotIndex] = normalizedCharId;
      }
      nextActiveSlot = findNextEmptySlot(next, targetSlotIndex);
      return next;
    });
    setActiveSlotIndex(nextActiveSlot);
  }, []);

  const clearSlot = (slotIndex) => {
    setSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    setActiveSlotIndex(slotIndex);
  };

  const handleRosterCharacterClick = (charId, event) => {
    if (event && event.currentTarget) {
          const el = event.currentTarget;
          gsap.timeline({ onComplete: () => gsap.set(el, { clearProps: "all" }) })
            .to(el, { scale: 0.8, duration: 0.1, ease: "power2.in" })
            .to(el, { scale: 1.15, filter: 'brightness(1.5) contrast(1.2)', duration: 0.15, ease: "back.out(3)" })
            .to(el, { scale: 0.9, opacity: 0.3, filter: 'grayscale(1) brightness(0.5)', duration: 0.2 });
    }
    const existingIndex = slots.indexOf(Number(charId));
    if (existingIndex !== -1) {
      clearSlot(existingIndex);
    } else {
      const targetSlotIndex = slots[activeSlotIndex] ? findNextEmptySlot(slots, activeSlotIndex) : activeSlotIndex;
      assignCharacterToSlot(Number(charId), targetSlotIndex);
      if (document.querySelector(`.slot-anim-${targetSlotIndex}`)) {
        gsap.fromTo(`.slot-anim-${targetSlotIndex}`, { scale: 0.8, opacity: 0, rotateY: 90 }, { scale: 1, opacity: 1, rotateY: 0, duration: 0.5, ease: 'back.out(1.5)' });
      }
    }
  };

  const handleTeamSlotDragStart = (slotIndex, event) => {
    if (!slots[slotIndex]) {
      event.preventDefault();
      return;
    }
    setDragIndex(slotIndex);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('zone-slot-index', String(slotIndex));
    if (document.querySelector(`.slot-anim-${slotIndex}`)) {
      gsap.to(`.slot-anim-${slotIndex}`, { scale: 0.9, opacity: 0.7, duration: 0.2 });
    }
  };

  const handleTeamSlotDragEnd = () => {
    if (dragIndex !== null && document.querySelector(`.slot-anim-${dragIndex}`)) {
      gsap.to(`.slot-anim-${dragIndex}`, { scale: 1, opacity: 1, duration: 0.2 });
    }
    setDragIndex(null);
    setDragOverSlotIndex(null);
  };
  
  const handleSlotDragOver = (slotIndex, event) => {
    event.preventDefault();
    if (dragOverSlotIndex !== slotIndex) setDragOverSlotIndex(slotIndex);
  };

  const handleSlotDragLeave = (slotIndex) => {
    if (dragOverSlotIndex === slotIndex) setDragOverSlotIndex(null);
  };

  const handleRosterDragStart = (charId, event) => {
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('zone-char-numid', String(charId));
  };

  const handleSlotDrop = (slotIndex, event) => {
    event.preventDefault();
    const droppedCharId = Number(event.dataTransfer.getData('zone-char-numid'));
    if (Number.isInteger(droppedCharId) && droppedCharId > 0) {
      assignCharacterToSlot(droppedCharId, slotIndex);
      setDragIndex(null);
      setDragOverSlotIndex(null);
      return;
    }
    const sourceRaw = event.dataTransfer.getData('zone-slot-index');
    const sourceIndex = Number.isInteger(Number(sourceRaw)) ? Number(sourceRaw) : dragIndex;
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex > 3 || sourceIndex === slotIndex || !slots[sourceIndex]) {
      setDragIndex(null);
      setDragOverSlotIndex(null);
      return;
    }
    const sourceSlotEl = document.querySelector(`.slot-anim-${sourceIndex}`);
    const targetSlotEl = document.querySelector(`.slot-anim-${slotIndex}`);
    if (sourceSlotEl) gsap.to(sourceSlotEl, { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 });
    if (targetSlotEl) gsap.to(targetSlotEl, { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 });
    setSlots((prev) => {
      const next = [...prev];
      if (next[slotIndex]) {
        const temp = next[slotIndex];
        next[slotIndex] = next[sourceIndex];
        next[sourceIndex] = temp;
      } else {
        next[slotIndex] = next[sourceIndex];
        next[sourceIndex] = null;
      }
      return next;
    });
    setActiveSlotIndex(slotIndex);
    setDragIndex(null);
    setDragOverSlotIndex(null);
  };

  const handleLoadZoneTeam = (zone) => {
    if (!Array.isArray(zone.sample_slot_order) || zone.sample_slot_order.length !== 4) return;
    setSlots(zone.sample_slot_order.map((value) => Number(value) || null));
    setTuneXorInput(String(zone.char_xor || ''));
    setTuneSlotInput(String(zone.char_slot || ''));
    setTuneSumInput(String(zone.char_sum || ''));
    setSuccess(`Loaded team and tuner from Zone ${zone.char_xor} / Slot ${zone.char_slot}`);
    setError('');
    if (formRef.current) {
       gsap.fromTo(formRef.current, { outline: "2px solid #6366f1", outlineOffset: "10px" }, { outline: "0px solid transparent", outlineOffset: "0px", duration: 1, ease: "power2.out" });
    }
  };

  const formatMmSsFromSeconds = useCallback((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return '';
    const total = Math.max(1, Math.round(numeric));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }, []);

  const handleExportZoneToCaverns = useCallback((zone) => {
    const slotOrder = Array.isArray(zone?.sample_slot_order)
      ? zone.sample_slot_order.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0).slice(0, 4)
      : [];
    if (slotOrder.length !== 4) { setError('Zone card cannot be exported: missing full team sample.'); return; }
    const clearSecondsRaw = zone?.latest_clear_time_seconds ?? zone?.avg_clear_time_seconds;
    const clearMmSs = formatMmSsFromSeconds(clearSecondsRaw);
    if (!clearMmSs) { setError('Zone card cannot be exported: clear time is missing.'); return; }
    const zoneCavernIds = Array.isArray(zone?.caverns) ? zone.caverns : [];
    const preferredCavern = findCavernById(zoneCavernIds[0]) || findCavernById(cavern) || null;
    const relicId = preferredCavern?.relicSetIds?.find((entry) => String(entry || '').trim()) || '';

    // Compute top 4 substats from all aggregated relics across all grouped reports
    const allRelics = Array.isArray(zone?.aggregated_relics)
      ? zone.aggregated_relics
      : (Array.isArray(zone?.sample_relic_data?.relics) ? zone.sample_relic_data.relics : []);
    const substatFreq = {};
    allRelics.forEach(r => {
      if (Array.isArray(r.substats)) {
        r.substats.forEach(s => {
          if (s) substatFreq[s] = (substatFreq[s] || 0) + 1;
        });
      }
    });
    const top4Substats = Object.entries(substatFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([stat]) => stat);

    const params = new URLSearchParams({ source: 'zone', chars: slotOrder.join(','), clear_time: clearMmSs });
    if (preferredCavern?.id) params.set('cavern', preferredCavern.id);
    if (relicId) params.set('relic_id', relicId);
    if (mapData?.epoch?.id) params.set('from_epoch', String(mapData.epoch.id));
    if (top4Substats.length > 0) params.set('substats', top4Substats.join(','));
    const base = String(import.meta.env.BASE_URL || '/');
    const basePath = base.endsWith('/') ? base.slice(0, -1) : base;
    window.location.assign(basePath + '/caverns?' + params.toString());
  }, [cavern, formatMmSsFromSeconds, mapData?.epoch?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (slots.some((value) => !Number.isInteger(Number(value)) || Number(value) <= 0)) {
      setError('Pick all 4 characters before submitting.');
      return;
    }
    if (new Set(slots.map((value) => Number(value))).size !== 4) {
      setError('Team must contain 4 unique characters.');
      return;
    }
    if (!cavern) { setError('Cavern is required (Optional Details step).'); return; }
    const clearTimeSeconds = parseClearTimeToSeconds(clearTimeInput);
    if (clearTimeSeconds === null) { setError('Clear time is required. Use MM:SS format.'); return; }
    const invalidRelic = relicCards.find((card) => !Array.isArray(card.substats) || card.substats.length !== 4);
    if (invalidRelic) { setError(`Relic #${invalidRelic.index} must have exactly 4 unique substats.`); return; }
    const conflictRelic = relicCards.find((card) => card.mainStat && card.substats.includes(card.mainStat));
    if (conflictRelic) { setError(`Relic #${conflictRelic.index} cannot include main stat in substats.`); return; }
    setSubmitting(true);
    try {
      const response = await fetch(buildZoneApiUrl('/api/zone/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          slot_order: slots.map((value) => Number(value)),
          outcome: suggestedOutcome,
          clear_time_seconds: clearTimeSeconds,
          reporter_name: authDisplayName || null,
          cavern: cavern || null,
          server_region: serverRegion,
          notes: notes || null,
          relic_data: {
            relic_count: relicCards.length,
            relics: relicCards.map((card) => ({ piece: card.piece, main_stat: card.mainStat || null, substats: [...card.substats] })),
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      const zoneXor = payload.submitted_zone?.char_xor ?? payload.run?.char_xor ?? '--';
      const zoneSlot = payload.submitted_zone?.char_slot ?? payload.run?.char_slot ?? '--';
      const warnings = Array.isArray(payload?.warnings) ? payload.warnings : (payload?.warning ? [payload.warning] : []);
      const warningText = warnings.length > 0 ? ' (' + warnings.map(e => e.replace(/_column_missing_in_zone_runs_table/, ' fallback active')).join(', ') + ')' : '';
      setSuccess(`Run submitted. XOR ${zoneXor} / SLOT ${zoneSlot}${warningText}`);
      setRequestedEpoch('current');
      setWorkspaceView('zones');
      setSlots([null, null, null, null]);
      setActiveSlotIndex(0);
      setCavern('');
      setServerRegion('asia');
      setNotes('');
      setClearTimeInput('');
      setRelicDropCount(7);
      setRelicCards(Array.from({ length: 7 }, (_, index) => buildEmptyRelicCard(index + 1)));
      setCharSearchTerm('');
      await fetchMap('current');
    } catch (submitError) {
      setError(mapAuthError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlagEpoch = async () => {
    setError('');
    setSuccess('');
    setFlagging(true);
    try {
      const response = await fetch(buildZoneApiUrl('/api/zone/flag-epoch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ notes: flagNotes || null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      if (payload.did_rotate_epoch) setSuccess('Epoch rotation confirmed. New epoch started.');
      else if (payload.already_flagged) setSuccess('You already flagged this epoch.');
      else setSuccess('Epoch flag submitted.');
      setShowFlagModal(false);
      setFlagNotes('');
      setRequestedEpoch('current');
    } catch (flagError) {
      setError(mapAuthError(flagError));
    } finally {
      setFlagging(false);
    }
  };

  const runAdminZoneAction = useCallback(async (payload) => {
    const response = await fetch(buildZoneApiUrl('/api/zone/admin-runs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'HTTP ' + response.status);
    return result;
  }, [getAuthHeader]);

  const handleReportZoneCard = useCallback((zone) => {
    if (!zone) return;
    setFlagNotes(`Zone report: XOR ${zone?.char_xor ?? '--'} / SLOT ${zone?.char_slot ?? '--'}`);
    setShowFlagModal(true);
  }, []);

  const handleAdminDeleteZone = useCallback(async (zone) => {
    if (!adminEligible || !adminModeEnabled || !zone) return;
    const zoneKey = buildZoneVariantKey(zone);
    const label = `Zone ${zone?.char_xor ?? '--'} / Slot ${zone?.char_slot ?? '--'}`;
    if (!window.confirm(`Delete ${label} from ${requestedEpoch} epoch? This removes matching reports.`)) return;
    setAdminActionLoadingKey('delete:' + zoneKey);
    setError('');
    setSuccess('');
    try {
      const result = await runAdminZoneAction({ action: 'delete_zone', epoch: requestedEpoch, region: mapRegion, xor_slot_key: zone?.xor_slot_key || '', char_xor: zone?.char_xor, char_slot: zone?.char_slot });
      setSuccess(`Deleted ${result.deleted_count || 0} run(s) from ${label}.`);
      await fetchMap(requestedEpoch);
    } catch (deleteError) {
      setError(mapAuthError(deleteError));
    } finally {
      setAdminActionLoadingKey('');
    }
  }, [adminEligible, adminModeEnabled, fetchMap, mapRegion, requestedEpoch, runAdminZoneAction]);

  const handleAdminEditZone = useCallback((zone) => {
    if (!adminEligible || !adminModeEnabled || !zone) return;
    setAdminEditModalZone(zone);
    setAdminEditDraft({
      xor: String(zone?.char_xor ?? ''),
      slot: String(zone?.char_slot ?? ''),
      sum: String(zone?.char_sum ?? ''),
      slotOrder: Array.isArray(zone?.sample_slot_order) && zone.sample_slot_order.length === 4
        ? zone.sample_slot_order.map((value) => String(value ?? ''))
        : ['', '', '', ''],
    });
    setError('');
  }, [adminEligible, adminModeEnabled]);

  const handleAdminEditDraftChange = useCallback((field, value) => {
    setAdminEditDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAdminEditCancel = useCallback(() => {
    setAdminEditModalZone(null);
    setAdminEditDraft({ xor: '', slot: '', sum: '', slotOrder: ['', '', '', ''] });
  }, []);

  const handleAdminEditSlotOrderChange = useCallback((index, value) => {
    setAdminEditDraft((prev) => {
      const next = Array.isArray(prev.slotOrder) ? [...prev.slotOrder] : ['', '', '', ''];
      next[index] = String(value ?? '');
      const numeric = next.map((entry) => parseNonNegativeInteger(entry, { max: 99999 }));
      if (numeric.length === 4 && numeric.every((entry) => entry !== null) && new Set(numeric).size === 4) {
        const [a, b, c, d] = numeric;
        return {
          ...prev,
          slotOrder: next,
          xor: String(a ^ b ^ c ^ d),
          slot: String((d * 3 + a + b + c) % 10000),
          sum: String(a + b + c + d),
        };
      }
      return { ...prev, slotOrder: next };
    });
  }, []);

  const handleAdminEditSubmit = useCallback(async () => {
    const zone = adminEditModalZone;
    if (!adminEligible || !adminModeEnabled || !zone) return;
    const nextSlotOrder = Array.isArray(adminEditDraft.slotOrder)
      ? adminEditDraft.slotOrder.map((value) => parseNonNegativeInteger(value, { max: 99999 }))
      : [];
    if (nextSlotOrder.length !== 4 || nextSlotOrder.some((value) => value === null)) {
      setError('Pick 4 valid characters for the squad.');
      return;
    }
    if (new Set(nextSlotOrder).size !== 4) {
      setError('Squad must contain 4 unique characters.');
      return;
    }
    const zoneKey = buildZoneVariantKey(zone);
    setAdminActionLoadingKey('edit:' + zoneKey);
    setError('');
    setSuccess('');
    try {
      const result = await runAdminZoneAction({
        action: 'edit_zone',
        epoch: requestedEpoch,
        region: mapRegion,
        xor_slot_key: zone?.xor_slot_key || '',
        char_xor: zone?.char_xor,
        char_slot: zone?.char_slot,
        new_slot_order: nextSlotOrder,
      });
      setSuccess(`Updated ${result.updated_count || 0} run(s) from the edited squad.`);
      setAdminEditModalZone(null);
      setAdminEditDraft({ xor: '', slot: '', sum: '', slotOrder: ['', '', '', ''] });
      await fetchMap(requestedEpoch);
    } catch (editError) {
      setError(mapAuthError(editError));
    } finally {
      setAdminActionLoadingKey('');
    }
  }, [adminEditDraft.slotOrder, adminEditModalZone, adminEligible, adminModeEnabled, fetchMap, mapRegion, requestedEpoch, runAdminZoneAction]);

  const handleAdminWipeEpoch = useCallback(async () => {
    if (!adminEligible || !adminModeEnabled) return;
    if (!window.confirm(`Full wipe ${requestedEpoch} epoch reports?`)) return;
    setAdminWipeLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await runAdminZoneAction({ action: 'wipe_epoch', epoch: requestedEpoch });
      setSuccess(`Wiped ${result.deleted_count || 0} run(s) from ${requestedEpoch} epoch.`);
      await fetchMap(requestedEpoch);
    } catch (wipeError) {
      setError(mapAuthError(wipeError));
    } finally {
      setAdminWipeLoading(false);
    }
  }, [adminEligible, adminModeEnabled, fetchMap, requestedEpoch, runAdminZoneAction]);

  const handleAdminWipeAll = useCallback(async () => {
    if (!adminEligible || !adminModeEnabled) return;
    const confirmText = adminWipeAllConfirmText.trim();
    if (!confirmText || confirmText !== 'WIPE_ALL_ZONE_RUNS') {
      if (confirmText) setError('Wipe cancelled: confirmation text did not match.');
      return;
    }
    setAdminWipeLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await runAdminZoneAction({ action: 'wipe_all', confirm: 'WIPE_ALL_ZONE_RUNS' });
      setSuccess(`Wiped ${result.deleted_count || 0} run(s) across all epochs.`);
      setShowAdminWipeAllModal(false);
      setAdminWipeAllConfirmText('');
      await fetchMap('current');
      setRequestedEpoch('current');
    } catch (wipeError) {
      setError(mapAuthError(wipeError));
    } finally {
      setAdminWipeLoading(false);
    }
  }, [adminEligible, adminModeEnabled, adminWipeAllConfirmText, fetchMap, runAdminZoneAction]);

  const handleExportDebugLogs = useCallback(async () => {
    setError('');
    setSuccess('');
    setExportingDebug(true);
    const exportScope = adminModeEnabled && adminEligible ? 'all' : 'self';
    try {
      const response = await fetch(buildZoneApiUrl(`/api/zone/export?scope=${encodeURIComponent(exportScope)}`), {
        method: 'GET',
        headers: { ...getAuthHeader() },
      });
      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        if ((response.headers.get('content-type') || '').includes('application/json')) {
          const payload = await response.json().catch(() => ({}));
          message = payload.error || message;
        } else {
          message = (await response.text().catch(() => '')) || message;
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const filenameMatch = (response.headers.get('content-disposition') || '').match(/filename="?([^";]+)"?/i);
      const filename = filenameMatch?.[1] || `zone-debug-export-${new Date().toISOString().slice(0, 10)}.txt`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setSuccess(exportScope === 'all' ? 'Admin export downloaded (all user logs).' : 'Debug export downloaded. Share this TXT file for analysis.');
    } catch (exportError) {
      const message = mapAuthError(exportError);
      if (message.toLowerCase().includes('admin scope denied')) setAdminModeEnabled(false);
      setError(message);
    } finally {
      setExportingDebug(false);
    }
  }, [adminEligible, adminModeEnabled, getAuthHeader]);

  return {
    user,
    getAuthHeader,
    roleMode,
    rootThemeClass,
    slots, setSlots,
    activeSlotIndex, setActiveSlotIndex,
    dragIndex, setDragIndex,
    dragOverSlotIndex, setDragOverSlotIndex,
    cavern, setCavern,
    serverRegion, setServerRegion,
    notes, setNotes,
    relicDropCount, setRelicDropCount,
    relicCards, setRelicCards,
    relicGridCompact, setRelicGridCompact,
    flagNotes, setFlagNotes,
    clearTimeInput, setClearTimeInput,
    workspaceView, setWorkspaceView,
    requestedEpoch, setRequestedEpoch,
    mapData,
    mapRegion, setMapRegion,
    mapTargetPreset, setMapTargetPreset,
    mapTargetMode, setMapTargetMode,
    mapTargetCustomStats, setMapTargetCustomStats,
    zoneCardView, setZoneCardView,
    showMapFilters, setShowMapFilters,
    showTuner, setShowTuner,
    loadingMap,
    submitting,
    flagging,
    error, setError,
    success, setSuccess,
    showFlagModal, setShowFlagModal,
    charSearchTerm, setCharSearchTerm,
    ownedCharIds,
    ownedSearchTerm, setOwnedSearchTerm,
    ownedLoading,
    ownedSaving,
    ownedImporting,
    rosterMode, setRosterMode,
    variantOwnershipFilter, setVariantOwnershipFilter,
    variantMinOwned, setVariantMinOwned,
    variantEnforceSum, setVariantEnforceSum,
    variantsByZone,
    setVariantsByZone,
    variantLoadingZoneKey,
    exportingDebug,
    adminEligible,
    adminModeEnabled, setAdminModeEnabled,
    adminStatusLoading,
    adminActionLoadingKey,
    adminWipeLoading,
    showAdminWipeAllModal,
    setShowAdminWipeAllModal,
    adminWipeAllConfirmText,
    setAdminWipeAllConfirmText,
    adminEditModalZone,
    adminEditDraft,
    tuneXorInput, setTuneXorInput,
    tuneSlotInput, setTuneSlotInput,
    tuneSumInput, setTuneSumInput,
    tunedZones,
    manualVariantPayload,
    manualVariantLoading,
    mapRef,
    formRef,
    tunerRef,
    charactersByNumId,
    authDisplayName,
    characterOptions,
    ownedOptions,
    ownedSet,
    relicSubstatFrequency,
    suggestedOutcome,
    currentTeamSignature,
    buildSlots,
    setBuildSlots,
    buildTeamSignature,
    buildVariantPayload,
    setBuildVariantPayload,
    buildVariantLoading,
    setBuildVariantLoading,
    epoch: mapData?.epoch,
    currentEpoch: mapData?.current_epoch,
    zones: Array.isArray(mapData?.zones) ? mapData.zones : [],
    isRelicTargetMode: Boolean(mapData?.target_filter?.active),
    signalMetricLabel: Boolean(mapData?.target_filter?.active) ? `${mapData?.target_filter?.label || 'Target Match'} Match` : 'Crit Potential',
    
    // Actions
    fetchMap,
    loadOwnedRoster,
    saveOwnedRoster,
    importOwnedRosterFile,
    toggleOwnedCharacter,
    toggleMapTargetCustomStat,
    fetchVariantsForZone,
    handleTuneFromZone,
    handleFindTunedZones,
    handleGenerateManualVariants,
    cycleRelicPiece,
    setRelicCardMainStat,
    toggleRelicCardSubstat,
    assignCharacterToSlot,
    clearSlot,
    handleRosterCharacterClick,
    handleTeamSlotDragStart,
    handleTeamSlotDragEnd,
    handleSlotDragOver,
    handleSlotDragLeave,
    handleRosterDragStart,
    handleSlotDrop,
    handleLoadZoneTeam,
    handleExportZoneToCaverns,
    handleSubmit,
    handleFlagEpoch,
    handleReportZoneCard,
    handleAdminDeleteZone,
    handleAdminEditZone,
    handleAdminEditDraftChange,
    handleAdminEditSlotOrderChange,
    handleAdminEditCancel,
    handleAdminEditSubmit,
    handleAdminWipeEpoch,
    handleAdminWipeAll,
    handleExportDebugLogs,
    sanitizeClearTimeMmSsInput,
    normalizeClearTimeMmSsInput
  };
}
