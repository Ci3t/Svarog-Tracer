import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { 
  Target, 
  Activity, 
  Flag, 
  Shield, 
  Zap, 
  BarChart3, 
  Plus, 
  Search,
  RefreshCw, 
  Clock, 
  Info, 
  User, 
  LayoutGrid,
  History,
  AlertTriangle,
  CheckCircle2,
  X,
  Dna,
  Navigation,
  Users,
  PlusCircle
} from 'lucide-react';
import charactersData from '../data/characters.json';
import { HSR_CAVERNS, findCavernById, getCavernDisplayName } from '../constants/caverns';
import { useAuth } from '../hooks/useAuth';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import ZoneHeader from '../components/zone/ZoneHeader';

const OUTCOME_OPTIONS = [
  { value: 'spd-double-crit', label: 'SPD + CR + CD', color: 'indigo' },
  { value: 'double-crit', label: 'CR + CD only', color: 'emerald' },
  { value: 'spd-one-crit', label: 'SPD + one crit', color: 'cyan' },
  { value: 'one-crit', label: 'One crit only', color: 'blue' },
  { value: 'effect-junk', label: 'Effect junk', color: 'amber' },
  { value: 'flat-junk', label: 'Flat junk', color: 'slate' },
  { value: 'mixed', label: 'Mixed', color: 'slate' },
];

const CONFIDENCE_STYLES = {
  HIGH: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] text-shadow-glow',
  MEDIUM: 'border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
  LOW: 'border-slate-600/40 bg-slate-800/50 text-slate-400',
};

const SERVER_REGION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'asia', label: 'Asia' },
  { value: 'europe', label: 'EU' },
  { value: 'america', label: 'NA' },
];

const SERVER_REGION_SUBMIT_OPTIONS = SERVER_REGION_OPTIONS.filter((region) => region.value !== 'all');

const MAP_TARGET_PRESET_OPTIONS = [
  { value: 'crit_potential', label: 'Crit Pot' },
  { value: 'crit_substats', label: 'Crit Stats' },
  { value: 'spd', label: 'SPD' },
  { value: 'hp_pct', label: 'HP%' },
  { value: 'break_effect', label: 'Break' },
  { value: 'spd_crit', label: 'SPD + Crit' },
  { value: 'custom', label: 'Custom' },
];

const MAP_TARGET_CUSTOM_MAX_STATS = 4;

const RELIC_CARD_PIECES = ['Head', 'Hands', 'Body', 'Feet', 'Orb', 'Rope'];
const RELIC_SUBSTAT_OPTIONS = ['Flat HP', 'Flat ATK', 'Flat DEF', 'HP%', 'ATK%', 'DEF%', 'SPD', 'CRIT Rate', 'CRIT DMG', 'Effect Hit Rate', 'Effect RES', 'Break Effect'];
const RELIC_MAIN_STAT_OPTIONS_BY_PIECE = Object.freeze({
  Head: ['Flat HP'],
  Hands: ['Flat ATK'],
  Body: ['CRIT Rate', 'CRIT DMG', 'Outgoing Healing Boost', 'Effect Hit Rate', 'ATK%', 'DEF%', 'HP%'],
  Feet: ['SPD', 'ATK%', 'DEF%', 'HP%', 'Break Effect'],
  Orb: ['Physical DMG', 'Fire DMG', 'Ice DMG', 'Wind DMG', 'Lightning DMG', 'Quantum DMG', 'Imaginary DMG', 'ATK%', 'DEF%', 'HP%'],
  Rope: ['Energy Regeneration Rate', 'Break Effect', 'ATK%', 'DEF%', 'HP%'],
});
const RELIC_FIXED_MAIN_STATS = Object.freeze({
  Head: 'Flat HP',
  Hands: 'Flat ATK',
});

function getMainStatOptionsForPiece(piece) {
  return RELIC_MAIN_STAT_OPTIONS_BY_PIECE[piece] || [];
}

function getDefaultMainStatForPiece(piece) {
  return RELIC_FIXED_MAIN_STATS[piece] || null;
}

function buildEmptyRelicCard(index) {
  const piece = 'Head';
  return {
    index,
    piece,
    mainStat: getDefaultMainStatForPiece(piece),
    substats: [],
  };
}

function inferOutcomeFromRelics(relicCards) {
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

function formatRate(rate) {
  if (rate === null || rate === undefined) return '--';
  return `${Math.round(Number(rate) * 100)}%`;
}

function formatDropScore(score) {
  if (score === null || score === undefined) return '--';
  return `${Math.round(Number(score) * 100)}%`;
}

function parseClearTimeToSeconds(value) {
  if (value === undefined || value === null || value === '') return null;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const numeric = Number(raw);
    return Number.isFinite(numeric) && numeric > 0 ? Number(numeric.toFixed(3)) : null;
  }

  const parts = raw.split(':').map((entry) => entry.trim());
  if (parts.length !== 2 && parts.length !== 3) {
    return null;
  }

  const nums = parts.map((entry) => Number(entry));
  if (nums.some((num) => !Number.isFinite(num) || num < 0)) {
    return null;
  }

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

function formatClearTimeSeconds(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '--';

  const totalSeconds = Math.round(numeric);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(remMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


function sanitizeClearTimeMmSsInput(value) {
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

function normalizeClearTimeMmSsInput(value) {
  const parsed = parseClearTimeToSeconds(value);
  if (parsed === null) return String(value || '').trim();

  const totalSeconds = Math.round(parsed);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
function resolveAuthDisplayName(user) {
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

function mapAuthError(error) {
  if (!error) return 'Unknown error';
  if (error.message?.includes('401')) return 'Authentication required. Please sign in again.';
  return error.message || 'Request failed';
}

function findNextEmptySlot(slotsArray, startIndex = 0) {
  for (let i = 0; i < 4; i++) {
    const idx = (startIndex + i) % 4;
    if (!slotsArray[idx]) return idx;
  }
  return 0; // default if all full
}

function parseNonNegativeInteger(value, { max = null } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  if (!/^\d+$/.test(raw)) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  if (max !== null && parsed > max) {
    return max;
  }

  return parsed;
}

function buildZoneVariantKey(zone) {
  const explicit = String(zone?.xor_slot_key || '').trim();
  if (explicit) return explicit;

  const xor = parseNonNegativeInteger(zone?.char_xor, { max: 99999 });
  const slot = parseNonNegativeInteger(zone?.char_slot, { max: 99999 });
  const sum = parseNonNegativeInteger(zone?.char_sum, { max: 99999 });

  if (xor === null || slot === null) return '';
  return String(xor) + ':' + String(slot) + ':' + String(sum === null ? 'na' : sum);
}

export default function ZoneTrackerPage({ sessionTheme = 'modern' }) {
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
  const [rosterMode, setRosterMode] = useState('team');

  const [variantOwnershipFilter, setVariantOwnershipFilter] = useState('all');
  const [variantEnforceSum, setVariantEnforceSum] = useState(true);
  const [variantsByZone, setVariantsByZone] = useState({});
  const [variantLoadingZoneKey, setVariantLoadingZoneKey] = useState('');
  const [exportingDebug, setExportingDebug] = useState(false);
  const [adminEligible, setAdminEligible] = useState(false);
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);
  const [adminStatusLoading, setAdminStatusLoading] = useState(false);
  const [adminActionLoadingKey, setAdminActionLoadingKey] = useState('');
  const [adminWipeLoading, setAdminWipeLoading] = useState(false);

  const [tuneXorInput, setTuneXorInput] = useState('');
  const [tuneSlotInput, setTuneSlotInput] = useState('');
  const [tuneSumInput, setTuneSumInput] = useState('');
  const [tunedZones, setTunedZones] = useState([]);
  const [manualVariantPayload, setManualVariantPayload] = useState(null);
  const [manualVariantLoading, setManualVariantLoading] = useState(false);



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
        const params = new URLSearchParams({
          epoch: String(epoch),
          region: String(mapRegion),
        });

        if (mapTargetPreset !== 'crit_potential') {
          params.set('target', mapTargetPreset);
          if (mapTargetPreset === 'custom') {
            params.set('stats', mapTargetCustomStats.join(','));
            params.set('match_mode', mapTargetMode);
          }
        }

        const response = await fetch(`/api/zone/map?${params.toString()}`, {
          method: 'GET',
          headers: {
            ...getAuthHeader(),
          },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || `HTTP ${response.status}`);
        }

        setMapData(payload);
        
        // Staggered entry animation for zones
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
    setOwnedLoading(true);

    try {
      const response = await fetch('/api/zone/owned', {
        method: 'GET',
        headers: {
          ...getAuthHeader(),
        },
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
  }, [getAuthHeader]);

  const saveOwnedRoster = useCallback(async () => {
    setOwnedSaving(true);

    try {
      const response = await fetch('/api/zone/owned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ owned_char_ids: ownedCharIds }),
      });

      if (response.status === 404) {
        throw new Error('Owned roster API is not available. Run backend API (npx vercel dev).');
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      setOwnedCharIds(Array.isArray(payload.owned_char_ids) ? payload.owned_char_ids.map(Number) : []);
      setSuccess('Owned roster saved.');
    } catch (ownedError) {
      setError(mapAuthError(ownedError));
    } finally {
      setOwnedSaving(false);
    }
  }, [getAuthHeader, ownedCharIds]);

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
    const minOwned = useOwnedFilter ? 3 : 0;

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

      const response = await fetch(`/api/zone/variants?${params.toString()}`, {
        method: 'GET',
        headers: {
          ...getAuthHeader(),
        },
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
  }, [getAuthHeader, requestedEpoch, variantOwnershipFilter, variantEnforceSum]);

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
    setSuccess(
      'Found ' +
        matched.length +
        ' zone suggestion(s) near Zone ' +
        targetXor +
        (targetSlot !== null ? ' / Slot ' + targetSlot : '') +
        '.'
    );
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
    const minOwned = useOwnedFilter ? 3 : 0;

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

      if (targetSum !== null) {
        params.set('sum', String(targetSum));
      }

      const response = await fetch(`/api/zone/variants?${params.toString()}`, {
        method: 'GET',
        headers: {
          ...getAuthHeader(),
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

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
  }, [getAuthHeader, requestedEpoch, tuneSlotInput, tuneSumInput, tuneXorInput, variantEnforceSum, variantOwnershipFilter]);

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
        const response = await fetch('/api/zone/export?status=true', {
          method: 'GET',
          headers: {
            ...getAuthHeader(),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json().catch(() => ({}));
        if (!isMounted) return;

        const allowed = Boolean(payload?.is_admin);
        setAdminEligible(allowed);
        if (!allowed) {
          setAdminModeEnabled(false);
        }
      } catch {
        if (!isMounted) return;
        setAdminEligible(false);
        setAdminModeEnabled(false);
      } finally {
        if (isMounted) {
          setAdminStatusLoading(false);
        }
      }
    };

    fetchAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [getAuthHeader]);

  useEffect(() => {
    if (!adminEligible) {
      setAdminModeEnabled(false);
      return;
    }

    setAdminModeEnabled(roleMode === 'admin');
  }, [adminEligible, roleMode]);

  // Initial page hook
  useEffect(() => {
    const header = document.querySelector('.page-header');
    if (!header) return;

    gsap.fromTo(header,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    );
  }, []);

  const slotSummary = useMemo(() => {
    return slots
      .map((charId) => (charId ? charactersByNumId.get(Number(charId))?.name || `#${charId}` : 'Empty'))
      .join(' / ');
  }, [charactersByNumId, slots]);

  const currentTeamSignature = useMemo(() => {
    const numeric = slots
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (numeric.length !== 4) {
      return null;
    }

    return numeric.reduce((total, value) => total + value, 0);
  }, [slots]);

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

        next.push({
          index: i + 1,
          piece,
          mainStat,
          substats,
        });
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

      if (card.mainStat && card.mainStat === substat) {
        return card;
      }

      if (card.substats.includes(substat)) {
        return { ...card, substats: card.substats.filter((value) => value !== substat) };
      }

      if (card.substats.length >= 4) {
        return card;
      }

      return { ...card, substats: [...card.substats, substat] };
    }));
  }, []);

  const assignCharacterToSlot = useCallback((charId, targetSlotIndex) => {
    let nextActiveSlot = targetSlotIndex;

    setSlots((prev) => {
      const next = [...prev];
      const normalizedCharId = Number(charId);
      const existingIndex = next.indexOf(normalizedCharId);

      // Same slot = no op
      if (existingIndex === targetSlotIndex) {
        nextActiveSlot = targetSlotIndex;
        return prev;
      }

      if (existingIndex !== -1) {
        // Swap or move
        if (next[targetSlotIndex]) {
          next[existingIndex] = next[targetSlotIndex];
          next[targetSlotIndex] = normalizedCharId;
        } else {
          next[existingIndex] = null;
          next[targetSlotIndex] = normalizedCharId;
        }
      } else {
        // Fresh drop
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
    // Anim for grid node click
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
      
      // Anim for slot appearance
      if (document.querySelector(`.slot-anim-${targetSlotIndex}`)) {
        gsap.fromTo(`.slot-anim-${targetSlotIndex}`,
          { scale: 0.8, opacity: 0, rotateY: 90 },
          { scale: 1, opacity: 1, rotateY: 0, duration: 0.5, ease: 'back.out(1.5)' }
        );
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
    if (dragOverSlotIndex !== slotIndex) {
      setDragOverSlotIndex(slotIndex);
    }
  };

  const handleSlotDragLeave = (slotIndex) => {
    if (dragOverSlotIndex === slotIndex) {
      setDragOverSlotIndex(null);
    }
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

    if (
      !Number.isInteger(sourceIndex) ||
      sourceIndex < 0 ||
      sourceIndex > 3 ||
      sourceIndex === slotIndex ||
      !slots[sourceIndex]
    ) {
      setDragIndex(null);
      setDragOverSlotIndex(null);
      return;
    }

    // Animation for swap
    const sourceSlotEl = document.querySelector(`.slot-anim-${sourceIndex}`);
    const targetSlotEl = document.querySelector(`.slot-anim-${slotIndex}`);
    if (sourceSlotEl) {
      gsap.to(sourceSlotEl, { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 });
    }
    if (targetSlotEl) {
      gsap.to(targetSlotEl, { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 });
    }

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
    setSuccess(`Loaded team from Zone ${zone.char_xor} / Slot ${zone.char_slot}`);
    setError('');
    
    // Highlight team builder
    if (formRef.current) {
       gsap.fromTo(formRef.current, 
         { outline: "2px solid #6366f1", outlineOffset: "10px" },
         { outline: "0px solid transparent", outlineOffset: "0px", duration: 1, ease: "power2.out" }
       );
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

    if (slotOrder.length !== 4) {
      setError('Zone card cannot be exported: missing full team sample.');
      return;
    }

    const clearSecondsRaw = zone?.latest_clear_time_seconds ?? zone?.avg_clear_time_seconds;
    const clearMmSs = formatMmSsFromSeconds(clearSecondsRaw);
    if (!clearMmSs) {
      setError('Zone card cannot be exported: clear time is missing.');
      return;
    }

    const zoneCavernIds = Array.isArray(zone?.caverns) ? zone.caverns : [];
    const preferredCavern = findCavernById(zoneCavernIds[0]) || findCavernById(cavern) || null;
    const relicId = preferredCavern?.relicSetIds?.find((entry) => String(entry || '').trim()) || '';

    // Extract substats if available from zone sample
    const sampleRelics = Array.isArray(zone?.sample_relic_data?.relics) ? zone.sample_relic_data.relics : [];
    const substatStrings = sampleRelics.map(r => Array.isArray(r.substats) ? r.substats.join(',') : '').filter(Boolean);

    const params = new URLSearchParams({
      source: 'zone',
      chars: slotOrder.join(','),
      clear_time: clearMmSs,
    });

    if (preferredCavern?.id) params.set('cavern', preferredCavern.id);
    if (relicId) params.set('relic_id', relicId);
    if (mapData?.epoch?.id) params.set('from_epoch', String(mapData.epoch.id));
    if (substatStrings.length > 0) params.set('substats', substatStrings.join('|'));

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

    const uniqueCount = new Set(slots.map((value) => Number(value))).size;
    if (uniqueCount !== 4) {
      setError('Team must contain 4 unique characters.');
      return;
    }

    if (!cavern) {
      setError('Cavern is required (Optional Details step).');
      return;
    }

    const clearTimeSeconds = parseClearTimeToSeconds(clearTimeInput);
    if (clearTimeSeconds === null) {
      setError('Clear time is required. Use MM:SS format.');
      return;
    }

    const invalidRelic = relicCards.find((card) => !Array.isArray(card.substats) || card.substats.length !== 4);
    if (invalidRelic) {
      setError(`Relic #${invalidRelic.index} must have exactly 4 unique substats.`);
      return;
    }

    const conflictRelic = relicCards.find((card) => card.mainStat && card.substats.includes(card.mainStat));
    if (conflictRelic) {
      setError(`Relic #${conflictRelic.index} cannot include main stat in substats.`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/zone/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
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
            relics: relicCards.map((card) => ({
              piece: card.piece,
              main_stat: card.mainStat || null,
              substats: [...card.substats],
            })),
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      const zoneXor = payload.submitted_zone?.char_xor ?? payload.run?.char_xor ?? '--';
      const zoneSlot = payload.submitted_zone?.char_slot ?? payload.run?.char_slot ?? '--';
      const warnings = Array.isArray(payload?.warnings)
        ? payload.warnings
        : payload?.warning
          ? [payload.warning]
          : [];

      const warningText = warnings.length > 0
        ? ' (' + warnings.map((entry) => {
          if (entry === 'reporter_name_column_missing_in_zone_runs_table') return 'reporter fallback active';
          if (entry === 'clear_time_seconds_column_missing_in_zone_runs_table') return 'clear-time fallback active';
          if (entry === 'relic_data_column_missing_in_zone_runs_table') return 'relic-data fallback active';
          return entry;
        }).join(', ') + ')'
        : '';

      setSuccess(`Run submitted. XOR ${zoneXor} / SLOT ${zoneSlot}${warningText}`);
      setRequestedEpoch('current');
      setWorkspaceView('zones');
      setSlots([null, null, null, null]);
      setActiveSlotIndex(0);
      setDragIndex(null);
      setDragOverSlotIndex(null);
      setCavern('');
      setServerRegion('asia');
      setNotes('');
      setClearTimeInput('');
      setRelicDropCount(7);
      setRelicCards(Array.from({ length: 7 }, (_, index) => buildEmptyRelicCard(index + 1)));
      setCharSearchTerm('');

      if (payload?.submitted_zone) {
        const incoming = payload.submitted_zone;
        const incomingKey = buildZoneVariantKey(incoming);

        setMapData((prev) => {
          if (!prev || !Array.isArray(prev.zones)) {
            return {
              success: true,
              requested_epoch: 'current',
              current_epoch: null,
              epoch: null,
              pending_flag_count: 0,
              total_runs: Number(incoming?.runs) || 1,
              epoch_summary: {
                total_runs: Number(incoming?.runs) || 1,
                crit_count: Number(incoming?.crit_count) || 0,
                junk_count: Number(incoming?.junk_count) || 0,
                mixed_count: Number(incoming?.mixed_count) || 0,
                crit_rate: Number(incoming?.crit_rate) || null,
                avg_drop_score: Number(incoming?.avg_drop_score) || null,
                avg_clear_time_seconds: Number(incoming?.avg_clear_time_seconds) || null,
                clear_time_samples: Number(incoming?.clear_time_samples) || 0,
              },
              zones: [incoming],
              generated_at: new Date().toISOString(),
            };
          }

          const zones = [...prev.zones];
          const existingIndex = zones.findIndex((entry) => buildZoneVariantKey(entry) === incomingKey);

          if (existingIndex >= 0) {
            const existing = zones[existingIndex];
            zones[existingIndex] = {
              ...existing,
              ...incoming,
              runs: (Number(existing?.runs) || 0) + (Number(incoming?.runs) || 1),
              latest_reporter_name: incoming.latest_reporter_name || existing.latest_reporter_name || null,
              latest_clear_time_seconds: incoming.latest_clear_time_seconds ?? existing.latest_clear_time_seconds ?? null,
              reporter_names: Array.from(new Set([...(Array.isArray(existing?.reporter_names) ? existing.reporter_names : []), ...(Array.isArray(incoming?.reporter_names) ? incoming.reporter_names : [])])),
              regions: Array.from(new Set([...(Array.isArray(existing?.regions) ? existing.regions : []), ...(Array.isArray(incoming?.regions) ? incoming.regions : [])])),
              caverns: Array.from(new Set([...(Array.isArray(existing?.caverns) ? existing.caverns : []), ...(Array.isArray(incoming?.caverns) ? incoming.caverns : [])])),
            };
          } else {
            zones.unshift(incoming);
          }

          return {
            ...prev,
            total_runs: (Number(prev?.total_runs) || 0) + (Number(incoming?.runs) || 1),
            zones,
          };
        });
      }

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
      const response = await fetch('/api/zone/flag-epoch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ notes: flagNotes || null }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      if (payload.did_rotate_epoch) {
        setSuccess('Epoch rotation confirmed. New epoch started.');
      } else if (payload.already_flagged) {
        setSuccess('You already flagged this epoch.');
      } else {
        setSuccess('Epoch flag submitted.');
      }

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
    const response = await fetch('/api/zone/admin-runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'HTTP ' + response.status);
    }

    return result;
  }, [getAuthHeader]);

  const handleReportZoneCard = useCallback((zone) => {
    if (!zone) return;
    const zoneXor = zone?.char_xor ?? '--';
    const zoneSlot = zone?.char_slot ?? '--';
    setFlagNotes('Zone report: XOR ' + zoneXor + ' / SLOT ' + zoneSlot);
    setShowFlagModal(true);
  }, []);

  const handleAdminDeleteZone = useCallback(async (zone) => {
    if (!adminEligible || !adminModeEnabled || !zone) return;

    const zoneKey = buildZoneVariantKey(zone);
    const label = 'Zone ' + (zone?.char_xor ?? '--') + ' / Slot ' + (zone?.char_slot ?? '--');
    const confirmed = window.confirm('Delete ' + label + ' from ' + requestedEpoch + ' epoch? This removes matching reports.');
    if (!confirmed) return;

    setAdminActionLoadingKey('delete:' + zoneKey);
    setError('');
    setSuccess('');

    try {
      const result = await runAdminZoneAction({
        action: 'delete_zone',
        epoch: requestedEpoch,
        region: mapRegion,
        xor_slot_key: zone?.xor_slot_key || '',
        char_xor: zone?.char_xor,
        char_slot: zone?.char_slot,
      });

      setSuccess('Deleted ' + (result.deleted_count || 0) + ' run(s) from ' + label + '.');
      await fetchMap(requestedEpoch);
    } catch (deleteError) {
      setError(mapAuthError(deleteError));
    } finally {
      setAdminActionLoadingKey('');
    }
  }, [adminEligible, adminModeEnabled, fetchMap, mapRegion, requestedEpoch, runAdminZoneAction]);

  const handleAdminEditZone = useCallback(async (zone) => {
    if (!adminEligible || !adminModeEnabled || !zone) return;

    const draft = window.prompt(
      'Enter new Zone, Slot, Sig (comma separated):',
      String(zone?.char_xor ?? '') + ',' + String(zone?.char_slot ?? '') + ',' + String(zone?.char_sum ?? '')
    );

    if (!draft) return;

    const parts = String(draft)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (parts.length < 2) {
      setError('Edit requires at least Zone and Slot (comma separated).');
      return;
    }

    const nextXor = parseNonNegativeInteger(parts[0], { max: 99999 });
    const nextSlot = parseNonNegativeInteger(parts[1], { max: 99999 });
    const nextSum = parts[2] !== undefined ? parseNonNegativeInteger(parts[2], { max: 99999 }) : null;

    if (nextXor === null || nextSlot === null) {
      setError('Invalid Zone/Slot values.');
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
        new_char_xor: nextXor,
        new_char_slot: nextSlot,
        ...(nextSum !== null ? { new_char_sum: nextSum } : {}),
      });

      setSuccess('Updated ' + (result.updated_count || 0) + ' run(s) to Zone ' + nextXor + ' / Slot ' + nextSlot + '.');
      await fetchMap(requestedEpoch);
    } catch (editError) {
      setError(mapAuthError(editError));
    } finally {
      setAdminActionLoadingKey('');
    }
  }, [adminEligible, adminModeEnabled, fetchMap, mapRegion, requestedEpoch, runAdminZoneAction]);

  const handleAdminWipeEpoch = useCallback(async () => {
    if (!adminEligible || !adminModeEnabled) return;

    const confirmed = window.confirm('Full wipe ' + requestedEpoch + ' epoch reports?');
    if (!confirmed) return;

    setAdminWipeLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await runAdminZoneAction({
        action: 'wipe_epoch',
        epoch: requestedEpoch,
      });

      setSuccess('Wiped ' + (result.deleted_count || 0) + ' run(s) from ' + requestedEpoch + ' epoch.');
      await fetchMap(requestedEpoch);
    } catch (wipeError) {
      setError(mapAuthError(wipeError));
    } finally {
      setAdminWipeLoading(false);
    }
  }, [adminEligible, adminModeEnabled, fetchMap, requestedEpoch, runAdminZoneAction]);

  const handleAdminWipeAll = useCallback(async () => {
    if (!adminEligible || !adminModeEnabled) return;

    const confirmText = window.prompt('Type WIPE_ALL_ZONE_RUNS to wipe all zone reports:');
    if (!confirmText) return;

    if (confirmText.trim() !== 'WIPE_ALL_ZONE_RUNS') {
      setError('Wipe cancelled: confirmation text did not match.');
      return;
    }

    setAdminWipeLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await runAdminZoneAction({
        action: 'wipe_all',
        confirm: 'WIPE_ALL_ZONE_RUNS',
      });

      setSuccess('Wiped ' + (result.deleted_count || 0) + ' run(s) across all epochs.');
      await fetchMap('current');
      setRequestedEpoch('current');
    } catch (wipeError) {
      setError(mapAuthError(wipeError));
    } finally {
      setAdminWipeLoading(false);
    }
  }, [adminEligible, adminModeEnabled, fetchMap, runAdminZoneAction]);

  const handleExportDebugLogs = useCallback(async () => {
    setError('');
    setSuccess('');
    setExportingDebug(true);

    const exportScope = adminModeEnabled && adminEligible ? 'all' : 'self';

    try {
      const response = await fetch(`/api/zone/export?scope=${encodeURIComponent(exportScope)}`, {
        method: 'GET',
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = await response.json().catch(() => ({}));
          message = payload.error || message;
        } else {
          const rawText = await response.text().catch(() => '');
          message = rawText || message;
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
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
      if (message.toLowerCase().includes('admin scope denied')) {
        setAdminModeEnabled(false);
      }
      setError(message);
    } finally {
      setExportingDebug(false);
    }
  }, [adminEligible, adminModeEnabled, getAuthHeader]);
  const currentEpoch = mapData?.current_epoch;
  const epoch = mapData?.epoch;
  const zones = Array.isArray(mapData?.zones) ? mapData.zones : [];
  const mapTargetFilter = mapData?.target_filter || null;
  const isRelicTargetMode = Boolean(mapTargetFilter?.active);
  const signalMetricLabel = isRelicTargetMode ? `${mapTargetFilter?.label || 'Target Match'} Match` : 'Crit Potential';

  const relicGridClass = relicGridCompact ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';
  const relicCardClass = relicGridCompact ? 'rounded-xl border relic-card-surface p-2' : 'rounded-xl border relic-card-surface p-4 shadow-xl';
  const relicSubstatGridClass = relicGridCompact ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-1 gap-2';
  const relicChipBaseClass = relicGridCompact ? 'px-1.5 py-1 rounded-md border text-[8px] font-black uppercase tracking-wide transition-all' : 'px-2 py-1.5 rounded-md border text-[9px] font-black uppercase tracking-wide transition-all';

  return (
    <div className={`${rootThemeClass} zone-tracker-shell max-w-[1440px] mx-auto space-y-8 pb-20 animate-in fade-in duration-700`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .modern-theme .zone-glass { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(51, 65, 85, 0.6); }
        .svarog-theme .zone-glass { background: rgba(5, 10, 24, 0.75); border: 1px solid rgba(99, 102, 241, 0.2); box-shadow: 0 8px 32px rgba(9, 9, 11, 0.6), inset 0 0 32px rgba(67, 56, 202, 0.05); backdrop-filter: blur(16px); }
        .arctic-theme .zone-glass { background: rgba(248, 250, 252, 0.6); border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 8px 32px rgba(100, 116, 139, 0.1), inset 0 0 32px rgba(255, 255, 255, 0.5); backdrop-filter: blur(16px); }

        .modern-theme .zone-glass-panel { background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(51, 65, 85, 0.4); }
        .svarog-theme .zone-glass-panel { background: rgba(9, 14, 30, 0.6); border: 1px solid rgba(79, 70, 229, 0.15); box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5); }
        .arctic-theme .zone-glass-panel { background: rgba(241, 245, 249, 0.5); border: 1px solid rgba(203, 213, 225, 0.5); box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.8); }

        .svarog-theme .text-shadow-glow { text-shadow: 0 0 16px currentColor, 0 0 32px currentColor; }
        .arctic-theme .text-shadow-glow { text-shadow: 0 2px 10px rgba(14, 165, 233, 0.3); }

        .custom-zone-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-zone-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .svarog-theme .custom-zone-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; }
        .arctic-theme .custom-zone-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.4); border-radius: 10px; }

        .zone-slot-hover:hover {
           transform: scale(1.02) translateY(-4px);
           box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .svarog-theme .zone-slot-active { box-shadow: 0 0 30px rgba(99, 102, 241, 0.3); border-color: rgba(129, 140, 248, 0.6); }
        .arctic-theme .zone-slot-active { box-shadow: 0 0 30px rgba(14, 165, 233, 0.2); border-color: rgba(56, 189, 248, 0.6); }

        .relic-button { background: rgba(2, 6, 23, 0.55); border-color: rgba(71, 85, 105, 0.8); color: #cbd5e1; cursor: pointer; }
        .relic-button:hover { border-color: rgba(99, 102, 241, 0.45); }
        .relic-button.active { background: rgba(79, 70, 229, 0.12); border-color: rgba(99, 102, 241, 0.55); color: #e0e7ff; box-shadow: 0 0 12px rgba(99, 102, 241, 0.15); }

        .svarog-theme .relic-button { background: rgba(15, 23, 42, 0.7); border-color: rgba(30, 41, 59, 0.8); color: #cbd5e1; }
        .svarog-theme .relic-button:hover { border-color: rgba(99, 102, 241, 0.5); background: rgba(30, 41, 59, 0.9); }
        .svarog-theme .relic-button.active { background: rgba(79, 70, 229, 0.15); border-color: rgba(99, 102, 241, 0.6); color: #e0e7ff; box-shadow: 0 0 15px rgba(99, 102, 241, 0.2); }

        .arctic-theme .relic-button { background: rgba(255, 255, 255, 0.7); border-color: rgba(226, 232, 240, 0.8); color: #475569; }
        .arctic-theme .relic-button:hover { border-color: rgba(14, 165, 233, 0.5); background: rgba(248, 250, 252, 0.9); }
        .arctic-theme .relic-button.active { background: rgba(14, 165, 233, 0.1); border-color: rgba(14, 165, 233, 0.5); color: #0284c7; box-shadow: 0 0 15px rgba(14, 165, 233, 0.15); }

        .zone-tracker-shell button:not(:disabled), .zone-tracker-shell [role="button"], .zone-tracker-shell select { cursor: pointer; }
        .zone-tracker-shell button:disabled { cursor: not-allowed; }

        .zone-tracker-shell .relic-card-surface {
          background: rgba(2, 6, 23, 0.45);
          border-color: rgba(71, 85, 105, 0.5);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .zone-tracker-shell .relic-button { background: rgba(2, 6, 23, 0.55); border-color: rgba(71, 85, 105, 0.8); color: #cbd5e1; }
        .zone-tracker-shell .relic-button:hover { border-color: rgba(99, 102, 241, 0.45); background: rgba(15, 23, 42, 0.9); }
        .zone-tracker-shell .relic-button.active { background: rgba(79, 70, 229, 0.14); border-color: rgba(99, 102, 241, 0.6); color: #e0e7ff; box-shadow: 0 0 12px rgba(99, 102, 241, 0.15); }

        .svarog-theme .zone-tracker-shell .relic-card-surface {
          background: rgba(9, 14, 30, 0.72);
          border-color: rgba(79, 70, 229, 0.24);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 20px rgba(9, 9, 11, 0.22);
        }
        .svarog-theme .zone-tracker-shell .relic-button { background: rgba(15, 23, 42, 0.72); border-color: rgba(30, 41, 59, 0.85); color: #cbd5e1; }
        .svarog-theme .zone-tracker-shell .relic-button:hover { border-color: rgba(99, 102, 241, 0.52); background: rgba(30, 41, 59, 0.92); }
        .svarog-theme .zone-tracker-shell .relic-button.active { background: rgba(79, 70, 229, 0.17); border-color: rgba(99, 102, 241, 0.66); color: #e0e7ff; box-shadow: 0 0 15px rgba(99, 102, 241, 0.24); }

        .arctic-theme .zone-tracker-shell .relic-card-surface {
          background: rgba(255, 255, 255, 0.78);
          border-color: rgba(125, 211, 252, 0.34);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
        }
        .arctic-theme .zone-tracker-shell .relic-button { background: rgba(255, 255, 255, 0.78); border-color: rgba(203, 213, 225, 0.9); color: #475569; }
        .arctic-theme .zone-tracker-shell .relic-button:hover { border-color: rgba(14, 165, 233, 0.55); background: rgba(248, 250, 252, 0.95); }
        .arctic-theme .zone-tracker-shell .relic-button.active { background: rgba(14, 165, 233, 0.12); border-color: rgba(14, 165, 233, 0.56); color: #0369a1; box-shadow: 0 0 15px rgba(14, 165, 233, 0.18); }

        .astral-theme .zone-tracker-shell .relic-card-surface {
          background: rgba(11, 14, 21, 0.85) !important;
          border-color: rgba(227, 192, 114, 0.28) !important;
          box-shadow: inset 0 1px 0 rgba(246, 223, 155, 0.08);
        }
        .astral-theme .zone-tracker-shell .relic-button { background: rgba(15, 18, 27, 0.88) !important; border-color: rgba(227, 192, 114, 0.34) !important; color: #d7dde8 !important; }
        .astral-theme .zone-tracker-shell .relic-button:hover { border-color: rgba(246, 223, 155, 0.5) !important; color: #f6df9b !important; }
        .astral-theme .zone-tracker-shell .relic-button.active { background: rgba(227, 192, 114, 0.14) !important; border-color: rgba(246, 223, 155, 0.6) !important; color: #f6df9b !important; box-shadow: 0 0 16px rgba(227, 192, 114, 0.24); }

        .crimson-theme .zone-tracker-shell .relic-card-surface {
          background: rgba(12, 12, 13, 0.9) !important;
          border-color: rgba(255, 0, 51, 0.24) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        .crimson-theme .zone-tracker-shell .relic-button { background: rgba(16, 16, 17, 0.92) !important; border-color: rgba(255, 0, 51, 0.3) !important; color: #f4f4f5 !important; }
        .crimson-theme .zone-tracker-shell .relic-button:hover { border-color: rgba(255, 77, 109, 0.52) !important; color: #ffe4eb !important; }
        .crimson-theme .zone-tracker-shell .relic-button.active { background: rgba(255, 0, 51, 0.18) !important; border-color: rgba(255, 77, 109, 0.62) !important; color: #ffe4eb !important; box-shadow: 0 0 15px rgba(255, 0, 51, 0.24); }

        .neon-theme .zone-tracker-shell .relic-card-surface {
          background: rgba(13, 17, 22, 0.9) !important;
          border-color: rgba(0, 243, 255, 0.26) !important;
          box-shadow: inset 0 1px 0 rgba(188, 0, 255, 0.12);
        }
        .neon-theme .zone-tracker-shell .relic-button { background: rgba(14, 18, 22, 0.92) !important; border-color: rgba(0, 243, 255, 0.3) !important; color: #d5faff !important; }
        .neon-theme .zone-tracker-shell .relic-button:hover { border-color: rgba(188, 0, 255, 0.5) !important; color: #ffffff !important; box-shadow: 0 0 10px rgba(0, 243, 255, 0.22); }
        .neon-theme .zone-tracker-shell .relic-button.active { background: rgba(0, 243, 255, 0.16) !important; border-color: rgba(0, 243, 255, 0.58) !important; color: #ffffff !important; box-shadow: 0 0 16px rgba(0, 243, 255, 0.3), 0 0 22px rgba(188, 0, 255, 0.14); }

      `}} />
      
      <ZoneHeader
        authDisplayName={authDisplayName}
        userId={user?.id}
        currentEpoch={currentEpoch}
        epoch={epoch}
        requestedEpoch={requestedEpoch}
        loadingMap={loadingMap}
        mapData={mapData}
        onSetRequestedEpoch={setRequestedEpoch}
      />

      <section className="theme-glass-card p-3 border-slate-800/70">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setWorkspaceView('logger')}
            className={workspaceView === 'logger' ? 'px-4 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 text-[10px] font-black uppercase tracking-widest text-indigo-100 cursor-pointer' : 'px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
          >
            Relic Log
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceView('zones')}
            className={workspaceView === 'zones' ? 'px-4 py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 text-[10px] font-black uppercase tracking-widest text-cyan-100 cursor-pointer' : 'px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
          >
            Zones
          </button>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-8 grid-cols-1">
        
        {/* Left Column: Submit & Status */}
        <div className={workspaceView === 'logger' ? 'space-y-8' : 'hidden'}>
          
          <section ref={formRef} className="theme-glass-card p-8 border-indigo-500/10 shadow-2xl overflow-visible">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white">Zone Transmitter</h2>
            </div>

            <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-[1fr_400px] gap-12 items-start space-y-12 lg:space-y-0">
              
              {/* Left Column: Team & Relics */}
              <div className="space-y-12">
                {/* Squad Assembly UI */}
                <div className="theme-glass-card p-6 border-slate-700/40 bg-slate-950/20">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">01</span>
                      <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Squad Assembly <span className="text-slate-600 ml-2">({slots.filter(Boolean).length}/4)</span></h3>
                    </div>
                  </div>
                  
                  {/* 4 Cards Grid */}
                  <div className="grid grid-cols-4 gap-3 md:gap-4 w-full">
                    {[0, 1, 2, 3].map(i => {
                      const charId = slots[i];
                      const char = charId ? charactersByNumId.get(Number(charId)) : null;
                      const rarityBg = char ? (char.rarity === 5 ? 'bg-gradient-to-t from-orange-500/80 via-orange-500/20 to-transparent' : 'bg-gradient-to-t from-purple-500/80 via-purple-500/20 to-transparent') : '';
                      const isDragOver = dragOverSlotIndex === i;
                      const isTarget = activeSlotIndex === i && slots.filter(Boolean).length < 4;
                      
                      return (
                        <div
                          key={`slot-${i}`}
                          draggable={Boolean(charId)}
                          onDragStart={(e) => handleTeamSlotDragStart(i, e)}
                          onDragEnd={handleTeamSlotDragEnd}
                          onDragOver={(e) => handleSlotDragOver(i, e)}
                          onDragLeave={() => handleSlotDragLeave(i)}
                          onDrop={(e) => handleSlotDrop(i, e)}
                          onClick={() => charId ? clearSlot(i) : setActiveSlotIndex(i)}
                          className={`aspect-[3/4] rounded-2xl border-2 transition-all relative group flex items-center justify-center overflow-hidden
                            ${isTarget ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-800'}
                            ${charId ? 'cursor-grab' : 'border-dashed bg-slate-900/40 hover:border-slate-600 cursor-pointer'}`}
                        >
                          {charId && char ? (
                            <>
                              <div className={`absolute inset-0 ${rarityBg}`}></div>
                              <img src={char.image} alt={char.name} className="w-full h-full object-cover relative z-10" />
                              <div className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center z-20">
                                <X className="w-6 h-6 text-white" />
                              </div>
                            </>
                          ) : (
                            <PlusCircle className={`w-8 h-8 ${isTarget ? 'text-indigo-400' : 'text-slate-600'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search for a character to add..."
                        value={charSearchTerm}
                        onChange={(e) => setCharSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/60 rounded-xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-indigo-500/50 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mt-4 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                      {characterOptions.map((c) => {
                        const inTeam = slots.includes(Number(c.numId));
                        return (
                          <div
                            key={c.id}
                            onClick={(e) => handleRosterCharacterClick(Number(c.numId), e)}
                            className={`relative aspect-square rounded-full border-2 cursor-pointer transition-all ${inTeam ? 'border-indigo-500 scale-90 opacity-50' : 'border-slate-700 hover:border-slate-400'}`}
                          >
                            <img src={c.image} alt={c.name} className="w-full h-full object-cover rounded-full" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Relic Logger Section */}
                <div className="theme-glass-card p-6 border-slate-700/40 bg-slate-950/20">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">02</span>
                      <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Relic Drops</h3>
                    </div>
                    <div className="flex items-center gap-2">
                       <button type="button" onClick={() => setRelicGridCompact(false)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${!relicGridCompact ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-slate-800 text-slate-500 hover:border-slate-600'}`}>Large</button>
                       <button type="button" onClick={() => setRelicGridCompact(true)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${relicGridCompact ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-slate-800 text-slate-500 hover:border-slate-600'}`}>Compact</button>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Relics Dropped</label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={relicDropCount}
                          onChange={(e) => setRelicDropCount(e.target.value)}
                          className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-cyan-300 outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div className="h-10 w-px bg-slate-800/60 mx-2" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Suggested Outcome</p>
                        <p className="text-xs font-black text-white mt-1 uppercase">{(OUTCOME_OPTIONS.find(o => o.value === suggestedOutcome)?.label || suggestedOutcome)}</p>
                      </div>
                    </div>

                    <div className={relicGridCompact ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
                      {relicCards.map((card, cardIndex) => (
                        <div key={`relic-${cardIndex}`} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-600 transition-all group">
                          <div className="flex items-center justify-between mb-3">
                             <span className="text-[10px] font-mono text-slate-500">{String(cardIndex + 1).padStart(2, '0')}</span>
                             <button type="button" onClick={() => cycleRelicPiece(cardIndex)} className="text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:underline">{card.piece}</button>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Main Stat</p>
                              {RELIC_FIXED_MAIN_STATS[card.piece] ? (
                                <div className="text-[10px] text-slate-300 font-medium">{RELIC_FIXED_MAIN_STATS[card.piece]}</div>
                              ) : (
                                <select
                                  value={card.mainStat || ''}
                                  onChange={(e) => setRelicCardMainStat(cardIndex, e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-[10px] text-slate-300 outline-none focus:border-indigo-500/40"
                                >
                                  <option value="">Select Main</option>
                                  {getMainStatOptionsForPiece(card.piece).map(ms => <option key={ms} value={ms}>{ms}</option>)}
                                </select>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              {RELIC_SUBSTAT_OPTIONS.map(substat => {
                                const active = card.substats.includes(substat);
                                return (
                                  <button
                                    key={substat}
                                    type="button"
                                    onClick={() => toggleRelicCardSubstat(cardIndex, substat)}
                                    className={`px-1.5 py-1 rounded text-[8px] font-bold uppercase transition-all border ${active ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200' : 'bg-slate-950/40 border-slate-800 text-slate-600 hover:border-slate-700'}`}
                                  >
                                    {substat}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Sidebar */}
              <div className="lg:sticky lg:top-8 space-y-10">
                <div className="theme-glass-card p-6 border-slate-700/40 bg-slate-950/20 space-y-8">
                  
                  {/* Step 03: Run Context */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-black">03</span>
                      <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Configuration</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Cavern Location</label>
                        <select
                          value={cavern || ''}
                          onChange={(e) => setCavern(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
                        >
                          <option value="">Select Cavern</option>
                          {HSR_CAVERNS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Region</label>
                          <select
                            value={serverRegion}
                            onChange={(e) => setServerRegion(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
                          >
                            {SERVER_REGION_SUBMIT_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Clear Time</label>
                          <input
                            type="text"
                            value={clearTimeInput}
                            onChange={(e) => setClearTimeInput(sanitizeClearTimeMmSsInput(e.target.value))}
                            onBlur={(e) => setClearTimeInput(normalizeClearTimeMmSsInput(e.target.value))}
                            placeholder="MM:SS"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-200 outline-none focus:border-indigo-500/50 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 04: Submission */}
                  <div className="space-y-6 pt-6 border-t border-slate-800/40">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none h-20 resize-none focus:border-indigo-500/50"
                        placeholder="Any notable drops or anomalies..."
                      />
                    </div>

                    <div className="space-y-4">
                       <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 rounded-xl bg-indigo-600 font-black text-xs uppercase tracking-widest text-white shadow-lg hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50"
                       >
                        {submitting ? 'Transmitting Data...' : 'Submit Zone Report'}
                       </button>

                       {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold">{error}</div>}
                       {success && <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">{success}</div>}
                    </div>
                  </div>

                  {/* Substat Stats Mini View */}
                  <div className="pt-6 border-t border-slate-800/40">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4">Batch Distribution</h4>
                    <div className="grid grid-cols-2 gap-2">
                       {RELIC_SUBSTAT_OPTIONS.map(substat => {
                          const count = relicSubstatFrequency[substat] || 0;
                          if (count === 0) return null;
                          return (
                            <div key={substat} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
                               <span className="text-[9px] font-bold text-slate-500 uppercase">{substat}</span>
                               <span className="text-[10px] font-black text-cyan-400">{count}</span>
                            </div>
                          );
                       })}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </section>

                                        {/* Guidelines Mini Panel */}
          <div className="theme-glass-card p-6 border-slate-700/40 bg-slate-950/20">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-4 h-4 text-slate-500" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reporting Guidelines</h3>
            </div>
            <ul className="space-y-2 text-[11px] text-slate-500 leading-relaxed font-bold">
              <li className="flex gap-2">
                <span className="text-indigo-500/60">*</span>
                Only submit runs where characters remained in the specified slot order throughout.
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500/60">*</span>
                Aggregated statistics rely on volume. Multiple user reports confirm "Active Zones".
              </li>
              <li className="flex gap-2 text-indigo-400/60">
                <span className="text-indigo-500/60">*</span>
                Confidentiality: Your user ID is used purely for anti-spam; reports are listed anonymously.
              </li>
            </ul>
          </div>

          <div className="theme-glass-card p-6 border-slate-700/40 bg-slate-950/20 mt-6">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Debug Export</h3>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Download zone logs as TXT for analysis. Admin mode can export all users.
            </p>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-3 mb-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Access</p>
                <span className={adminEligible ? 'px-2 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-emerald-300' : 'px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500'}>
                  {adminStatusLoading ? 'Checking...' : adminEligible ? 'Granted' : 'User'}
                </span>
              </div>

              {adminEligible ? (
                <button
                  type="button"
                  onClick={() => setAdminModeEnabled((prev) => !prev)}
                  disabled={adminStatusLoading}
                  className={adminModeEnabled ? 'w-full px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-200 hover:bg-amber-500/20 disabled:opacity-60' : 'w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:border-slate-500 disabled:opacity-60'}
                >
                  {adminModeEnabled ? 'Admin View: ON (Export All)' : 'Admin View: OFF (Export Self)'}
                </button>
              ) : (
                <p className="text-[10px] text-slate-500">Standard user mode: export includes your own logs only.</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportDebugLogs}
              disabled={exportingDebug || adminStatusLoading}
              className="w-full px-4 py-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
            >
              {exportingDebug
                ? 'Preparing Export...'
                : adminModeEnabled && adminEligible
                  ? 'Export All Logs (.txt)'
                  : 'Export My Logs (.txt)'}
            </button>

            <p className="text-[10px] text-slate-500 mt-3">
              Export includes slot order, hash values, region, outcome, notes, and full relic payload.
            </p>
          </div>
        </div>

        {/* Right Column: Zone Map */}
        <div ref={mapRef} className={workspaceView === 'zones' ? 'space-y-8' : 'hidden'}>
          <div className="flex flex-wrap items-end justify-between gap-3 px-2">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white text-shadow-glow">Community Map</h2>
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 p-1">
                <button
                  type="button"
                  onClick={() => setZoneCardView('grid')}
                  className={zoneCardView === 'grid' ? 'px-3 py-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-100' : 'px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setZoneCardView('list')}
                  className={zoneCardView === 'list' ? 'px-3 py-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/20 text-[10px] font-black uppercase tracking-widest text-cyan-100' : 'px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
                >
                  List
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowMapFilters((prev) => !prev)}
                className={showMapFilters ? 'px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 text-[10px] font-black uppercase tracking-widest text-indigo-100' : 'px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
              >
                {showMapFilters ? 'Hide Filters' : 'Show Filters'}
              </button>

              <div className="text-right">
                <p className="text-[10px] font-black tracking-widest text-slate-500 leading-none">Global Coverage</p>
                <p className="text-lg font-black text-indigo-300">{mapData?.total_runs ?? 0} <span className="text-[10px] text-slate-600">REPORTS</span></p>
                <p className="text-[9px] font-black tracking-widest text-slate-500">{isRelicTargetMode ? `TARGET ${String(mapTargetFilter?.label || 'Custom').toUpperCase()}` : `AVG DROP ${formatDropScore(mapData?.epoch_summary?.avg_drop_score)}`}</p>
              </div>
            </div>
          </div>

          <div className={showMapFilters ? 'mx-2 mt-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70 space-y-3' : 'hidden'}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Filter</p>
            <div className="flex flex-wrap items-center gap-2">
              {SERVER_REGION_OPTIONS.map((region) => (
                <button
                  key={`region-${region.value}`}
                  type="button"
                  onClick={() => setMapRegion(region.value)}
                  className={mapRegion === region.value ? 'px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-black uppercase tracking-widest text-indigo-100' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
                >
                  {region.label}
                </button>
              ))}
            </div>

            {mapData?.mixed_region_warning && mapRegion === 'all' ? (
              <p className="text-[10px] font-bold text-amber-300">{mapData.mixed_region_warning}</p>
            ) : null}

            <div className="pt-2 border-t border-slate-800/60 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Drop Target</p>
              <div className="flex flex-wrap items-center gap-2">
                {MAP_TARGET_PRESET_OPTIONS.map((option) => (
                  <button
                    key={`target-${option.value}`}
                    type="button"
                    onClick={() => setMapTargetPreset(option.value)}
                    className={mapTargetPreset === option.value ? 'px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest text-emerald-100' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {mapTargetPreset === 'custom' ? (
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMapTargetMode('any')}
                      className={mapTargetMode === 'any' ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-wide text-emerald-200' : 'px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500'}
                    >
                      Any
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapTargetMode('all')}
                      className={mapTargetMode === 'all' ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-wide text-emerald-200' : 'px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500'}
                    >
                      All
                    </button>
                    <span className="text-[9px] text-slate-500">Pick up to {MAP_TARGET_CUSTOM_MAX_STATS}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {RELIC_SUBSTAT_OPTIONS.map((stat) => {
                      const active = mapTargetCustomStats.includes(stat);
                      return (
                        <button
                          key={`custom-target-${stat}`}
                          type="button"
                          onClick={() => toggleMapTargetCustomStat(stat)}
                          className={active ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-wide text-emerald-200' : 'px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500'}
                        >
                          {stat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <p className="text-[10px] text-slate-500">Target ranking uses submitted relic substats from real runs.</p>
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variant Filter</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVariantOwnershipFilter('all')}
                  className={variantOwnershipFilter === 'all' ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setVariantOwnershipFilter('owned')}
                  className={variantOwnershipFilter === 'owned' ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
                >
                  Owned
                </button>
              </div>
              <button
                type="button"
                onClick={() => setVariantEnforceSum((current) => !current)}
                className={variantEnforceSum ? 'px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-black uppercase tracking-widest text-indigo-100' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
              >
                {variantEnforceSum ? 'Sum Lock On' : 'Sum Lock Off'}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Controls</p>
                <span className={adminEligible ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-emerald-200' : 'px-2 py-1 rounded border border-slate-700 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500'}>
                  {adminStatusLoading ? 'Checking...' : adminEligible ? 'Granted' : 'User'}
                </span>
              </div>

              {adminEligible ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setAdminModeEnabled((prev) => !prev)}
                    className={adminModeEnabled ? 'w-full px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-200' : 'w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:border-slate-500'}
                  >
                    {adminModeEnabled ? 'Admin View: ON' : 'Admin View: OFF'}
                  </button>

                  {adminModeEnabled ? (
                    <div className="grid sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleAdminWipeEpoch}
                        disabled={adminWipeLoading}
                        className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        Wipe Epoch
                      </button>
                      <button
                        type="button"
                        onClick={handleAdminWipeAll}
                        disabled={adminWipeLoading}
                        className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        Wipe All
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">Enable admin mode to edit/delete or wipe reported zones.</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setShowTuner((prev) => !prev)}
                className={showTuner ? 'px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-[10px] font-black uppercase tracking-widest text-indigo-100' : 'px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
              >
                {showTuner ? 'Hide Zone Tuner' : 'Show Zone Tuner'}
              </button>
            </div>

            {showTuner ? (
              <div ref={tunerRef} className="pt-2 border-t border-slate-800/60 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zone Tuner</p>
              <p className="text-[10px] text-slate-500">Enter Zone and Slot Key from a good report, then add Team Signature only if you want stricter matching.</p>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Zone</span>
                  <input
                    type="number"
                    min={0}
                    value={tuneXorInput}
                    onChange={(event) => setTuneXorInput(event.target.value)}
                    placeholder="e.g. 423"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500/50"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Slot Key</span>
                  <input
                    type="number"
                    min={0}
                    value={tuneSlotInput}
                    onChange={(event) => setTuneSlotInput(event.target.value)}
                    placeholder="e.g. 7747"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500/50"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Team Signature (optional)</span>
                  <input
                    type="number"
                    min={0}
                    value={tuneSumInput}
                    onChange={(event) => setTuneSumInput(event.target.value)}
                    placeholder="SUM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500/50"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentTeamSignature !== null) {
                          setTuneSumInput(String(currentTeamSignature));
                        }
                      }}
                      disabled={currentTeamSignature === null}
                      className="px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500 disabled:opacity-50"
                    >
                      Use Current Team
                    </button>
                    <span className="text-[9px] text-slate-500">
                      {currentTeamSignature === null ? 'Pick 4 characters' : 'Current: ' + currentTeamSignature}
                    </span>
                  </div>
                </label>
              </div>


              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleFindTunedZones}
                  className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-black uppercase tracking-widest text-cyan-100 hover:bg-cyan-500/25"
                >
                  Find Zone Suggestions
                </button>
                <button
                  type="button"
                  onClick={handleGenerateManualVariants}
                  disabled={manualVariantLoading}
                  className="px-3 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest text-indigo-100 hover:bg-indigo-500/25 disabled:opacity-60"
                >
                  {manualVariantLoading ? 'Generating...' : 'Generate Variant Teams'}
                </button>
              </div>

              {tunedZones.length > 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {tunedZones.map((zone) => (
                    <div key={`tuned-${zone.xor_slot_key}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5">
                      <div>
                        <p className="text-[10px] font-black text-slate-200">Zone {zone.char_xor} / Slot {zone.char_slot}</p>
                        <p className="text-[9px] text-slate-500">Crit {formatRate(zone.crit_rate)} | Runs {zone.runs}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleTuneFromZone(zone)} className="px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500">Use</button>
                        <button type="button" onClick={() => handleLoadZoneTeam(zone)} className="px-2 py-1 rounded border border-indigo-500/40 text-[9px] font-black uppercase tracking-wide text-indigo-200 hover:bg-indigo-500/15">Load</button>
                        <button type="button" onClick={() => fetchVariantsForZone(zone)} disabled={variantLoadingZoneKey === buildZoneVariantKey(zone)} className="px-2 py-1 rounded border border-cyan-500/40 text-[9px] font-black uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-60">Var</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {manualVariantPayload ? (
                <div className="rounded-xl border border-indigo-500/20 bg-slate-950/70 p-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-2">Manual Variant Results ({Array.isArray(manualVariantPayload.variants) ? manualVariantPayload.variants.length : 0})</p>
                  {Array.isArray(manualVariantPayload.variants) && manualVariantPayload.variants.length > 0 ? (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
                      {manualVariantPayload.variants.map((variant) => (
                        <div key={`manual-variant-${variant.slot_order.join('-')}`} className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1.5">
                          <p className="text-[10px] font-black text-slate-200">{(variant.char_names || []).join(' / ')}</p>
                          <p className="text-[9px] text-slate-500">Owned {variant.owned_count}/4 | Seen {variant.observed_runs} | Crit {formatRate(variant.observed_crit_rate)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500">No variants found for this exact target.</p>
                  )}
                </div>
              ) : null}
              </div>
            ) : null}
            </div>

          {!mapData ? (
            <div className="h-64 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 gap-4">
              <RefreshCw className="w-10 h-10 opacity-20" />
              <p className="text-xs font-black uppercase tracking-[0.16em]">Initialize map to view signals</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="h-64 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 gap-4">
              <RefreshCw className="w-10 h-10 opacity-20" />
              <p className="text-xs font-black uppercase tracking-[0.16em]">No data signals detected in this epoch</p>
            </div>
          ) : (
            <div className={zoneCardView === 'grid' ? 'grid gap-4 md:grid-cols-2 2xl:grid-cols-3' : 'grid gap-4'}>
              {zones.map((zone, index) => {
                const signalRateRaw = isRelicTargetMode ? zone.target_rate : zone.crit_rate;
                const signalRate = signalRateRaw === null || signalRateRaw === undefined ? 0 : Number(signalRateRaw);
                const isGreat = signalRate >= 0.7 && zone.confidence !== 'LOW';
                const zoneKey = buildZoneVariantKey(zone);
                const variantState = variantsByZone[zoneKey];
                const variants = Array.isArray(variantState?.variants) ? variantState.variants : [];
                const regionTags = Array.isArray(zone?.regions) ? zone.regions : [];
                const cavernTags = Array.isArray(zone?.caverns) ? zone.caverns : [];
                const reporterLabel = zone?.latest_reporter_name || (Array.isArray(zone?.reporter_names) ? zone.reporter_names[0] : null) || 'Unknown';
                const clearTimeLabel = formatClearTimeSeconds(zone?.latest_clear_time_seconds ?? zone?.avg_clear_time_seconds);
                const cardActionBusy = adminActionLoadingKey === 'delete:' + zoneKey || adminActionLoadingKey === 'edit:' + zoneKey;
                
                return (
                  <div
                    key={zoneKey}
                    className={`zone-card group relative p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.99] cursor-default ${
                      isGreat 
                      ? 'bg-indigo-900/20 border-indigo-500/30 hover:border-indigo-400/50 shadow-[0_4px_20px_rgba(79,70,229,0.1)]' 
                      : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className={zoneCardView === 'grid' ? 'flex flex-col justify-between gap-4 relative z-10 h-full' : 'flex flex-col sm:flex-row justify-between gap-6 relative z-10'}>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-slate-950 text-[10px] font-black text-indigo-400 border border-slate-800 shadow-inner">
                              {index + 1}
                            </span>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Zone {zone.char_xor} / Slot {zone.char_slot}</h3>
                          </div>
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${CONFIDENCE_STYLES[zone.confidence] || CONFIDENCE_STYLES.LOW}`}>
                            {zone.confidence}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {regionTags.map((region) => (
                            <span key={`region-tag-${zoneKey}-${region}`} className="px-2 py-0.5 rounded border border-cyan-500/35 bg-cyan-500/10 text-[9px] font-black uppercase tracking-widest text-cyan-200">
                              {String(region).toUpperCase()}
                            </span>
                          ))}
                          {cavernTags.slice(0, 2).map((cavernId) => (
                            <span key={`cavern-tag-${zoneKey}-${getCavernDisplayName(cavernId)}`} className="px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-[9px] font-black uppercase tracking-widest text-indigo-200">
                              {cavernId}
                            </span>
                          ))}
                          <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-300">
                            By {reporterLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-emerald-200">
                            Clear {clearTimeLabel}
                          </span>
                        </div>

                        <div className="space-y-2 pb-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{signalMetricLabel}</span>
                            <span className={`text-sm font-black font-mono ${signalRate >= 0.5 ? 'text-indigo-300' : 'text-slate-400'}`}>
                              {formatRate(signalRateRaw)}
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                signalRate >= 0.7 ? 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 
                                signalRate >= 0.4 ? 'bg-indigo-500/60' : 'bg-slate-700'
                              }`} 
                              style={{ width: `${signalRate * 100}%` }} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Zone</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{zone.char_xor}</span>
                           </div>
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Slot Key</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{zone.char_slot}</span>
                           </div>
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Team Sig</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{zone.char_sum}</span>
                           </div>
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Reports</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{zone.runs}</span>
                           </div>
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Clear Time</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{clearTimeLabel}</span>
                           </div>
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{isRelicTargetMode ? 'Target Match' : 'Drop Score'}</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{isRelicTargetMode ? formatRate(zone.target_rate) : formatDropScore(zone.avg_drop_score)}</span>
                           </div>
                        </div>
                      </div>

                      <div className={zoneCardView === 'grid' ? 'flex flex-col gap-2 justify-end' : 'sm:w-64 flex flex-col gap-3 justify-end shrink-0'}>
                        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 h-full flex flex-col justify-center">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                             <Users className="w-3 h-3 text-slate-400" />
                             Top Performing Team
                          </p>
                          <div className="flex justify-between items-center bg-slate-900 border border-slate-800/80 p-1.5 rounded-[1.2rem]">
                            {(zone.sample_slot_order || []).map((charId, cidx) => {
                              const char = charactersByNumId.get(Number(charId));
                              return (
                                <div key={`sample-${cidx}`} title={char?.name} className="relative w-10 h-10 rounded-full border border-slate-700 overflow-hidden bg-slate-800 shrink-0">
                                  {char?.image ? (
                                    <img src={char.image} alt={char.name} className="w-full h-full object-cover scale-110" />
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleLoadZoneTeam(zone)}
                          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-all hover:border-indigo-500/50 shadow-lg shadow-indigo-500/5 active:scale-95"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Load Setup
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTuneFromZone(zone)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 hover:border-slate-500 hover:text-white transition-all"
                        >
                          Tune Zone/Slot
                        </button>

                        <button
                          type="button"
                          onClick={() => fetchVariantsForZone(zone)}
                          disabled={variantLoadingZoneKey === buildZoneVariantKey(zone)}
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-all hover:border-cyan-500/50 shadow-lg shadow-cyan-500/5 active:scale-95 disabled:opacity-60"
                        >
                          <Dna className="w-3.5 h-3.5" />
                          {variantLoadingZoneKey === buildZoneVariantKey(zone) ? 'Generating...' : 'Generate Variants'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportZoneToCaverns(zone)}
                          className="w-full py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200 hover:bg-emerald-500/20"
                        >
                          Export to Caverns
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReportZoneCard(zone)}
                          className="w-full py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200 hover:bg-amber-500/20"
                        >
                          Report Card
                        </button>

                        {adminEligible && adminModeEnabled ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleAdminEditZone(zone)}
                              disabled={cardActionBusy}
                              className="py-2 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 hover:border-slate-500 disabled:opacity-60"
                            >
                              {adminActionLoadingKey === 'edit:' + zoneKey ? 'Editing...' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdminDeleteZone(zone)}
                              disabled={cardActionBusy}
                              className="py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[10px] font-black uppercase tracking-[0.14em] text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                            >
                              {adminActionLoadingKey === 'delete:' + zoneKey ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {variantState ? (
                      <div className="mt-4 p-3 rounded-xl border border-cyan-500/20 bg-slate-950/60">
                        <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300 mb-2">Variant Team Matches ({variants.length})</p>
                        {variants.length === 0 ? (
                          <p className="text-[10px] text-slate-500 font-bold">No matching variants for selected filter.</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {variants.map((variant) => (
                              <div key={variant.slot_order.join('-')} className="p-2 rounded-lg border border-slate-800 bg-slate-900/70">
                                <p className="text-[10px] font-black text-slate-200 leading-tight">{(variant.char_names || []).join(' / ')}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Owned {variant.owned_count}/4 | Seen {variant.observed_runs} | Crit {formatRate(variant.observed_crit_rate)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {/* Map Footer Info */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <Info className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium normal-case">
              Practical scouting heuristic based on community reports. Hidden server state causes run-to-run variance. Scout before farming.
            </p>
          </div>
        </div>
      </div>

      {/* Epoch Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/80 animate-in fade-in duration-300">
          <div className="w-full max-w-md theme-glass-card p-8 border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.1)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-white">Report Anomaly</h3>
                <p className="text-xs text-slate-400">Flag an epoch shift if zones feel different.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Official epoch rotation occurs when <span className="text-amber-300 font-bold underline">2 distinct users</span> flag the current epoch.
              This resets the map data to gather fresh signals.
            </p>

            <div className="space-y-4">
              <textarea
                value={flagNotes}
                onChange={(e) => setFlagNotes(e.target.value.slice(0, 200))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none h-24 focus:border-amber-500/40 transition-all placeholder:text-slate-600"
                placeholder="Optional: Why do you think the zone shifted?"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowFlagModal(false)}
                  className="px-4 py-3.5 rounded-xl bg-slate-800 text-xs font-black uppercase tracking-widest text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlagEpoch}
                  disabled={flagging}
                  className="px-4 py-3.5 rounded-xl bg-amber-600 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 active:scale-95 transition-all hover:bg-amber-500"
                >
                  {flagging ? 'Processing...' : 'Confirm Flag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
