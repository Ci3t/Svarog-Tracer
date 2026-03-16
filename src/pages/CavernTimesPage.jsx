import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Trophy, Shield, Zap, Search, ChevronRight, ChevronLeft, Filter, Trash2, Star, Heart, Clock, AlertCircle, CheckCircle2, Info, ChevronDown, X, Sparkles, Binary, Gem, Navigation, RefreshCw, PlusCircle, Users } from 'lucide-react';
import ArcticSnow from '../components/snow/ArcticSnow';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';

// Static Data
import charactersData from '../data/characters.json';
import relicsData from '../data/relics.json';
import materialsData from '../data/materials.json';

// Fallback Icon Component
const VisualIcon = ({ src, name, className = "" }) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    const letter = name ? name.charAt(0).toUpperCase() : '?';
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white font-black border border-white/10 shadow-inner ${className}`}>
        {letter}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`object-contain ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};

// API Configuration
const API_URL = '/api/hsr/cavern-clears';
const GUIDES_API_URL = '/api/guides';

const CAVERN_PRESET_FLAGS_KEY = 'hsr_cavern_preset_flags_v1';
const CAVERN_PRESET_DATA_KEY = 'hsr_cavern_preset_data_v1';
const CAVERN_TEAM_PRESETS_KEY = 'hsr_cavern_team_presets_v1';
const CAVERN_RECENT_ITEMS_KEY = 'hsr_cavern_recent_items_v1';
const CAVERN_RECENT_TEAMS_KEY = 'hsr_cavern_recent_teams_v1';
const TEAM_PRESETS_PAGE_SIZE = 6;
const RECENT_ITEMS_LIMIT = 8;
const RECENT_TEAMS_LIMIT = 8;

const readStorageJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export default function CavernTimesPage({ sessionTheme = 'modern' }) {
  const baseUrl = import.meta.env.BASE_URL;
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const rootThemeClass = themeConfig.rootClassName;
  const isGlacial = rootThemeClass === 'arctic-theme';
  const isNeon = rootThemeClass === 'neon-theme';
  const cavernTheme = themeConfig.caverns || {};
  const showCavernBackdropImage =
    cavernTheme.disableBackdropImage !== true && Boolean(cavernTheme.backdropImage);
  const cavernOverlayClass =
    cavernTheme.overlayClass ||
    (rootThemeClass === 'neon-theme'
      ? 'from-[#121417]/92 via-[#121417]/62 to-[#0f1114]/95'
      : rootThemeClass === 'crimson-theme'
        ? 'from-black/88 via-black/52 to-[#050505]/96'
        : isGlacial
          ? 'from-[#03080f]/95 via-[#03080f]/40 to-[#03080f]/95'
          : 'from-[#020617]/90 via-[#020617]/40 to-[#020617]/90');

  const [clears, setClears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('relics');

  // Filtering
  const [activeFilters, setActiveFilters] = useState([]); // Array of domain IDs
  const [rarityFilter, setRarityFilter] = useState(null); // 2, 3, 4, 5
  const [searchTerm, setSearchTerm] = useState('');

  // Deletion & Admin
  const [userKeys, setUserKeys] = useState(() => JSON.parse(localStorage.getItem('hsr_user_keys') || '{}'));
  const [adminPass, setAdminPass] = useState(() => localStorage.getItem('hsr_admin_pass') || '');
  const [titleClicks, setTitleClicks] = useState(0);

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Refs
  const formRef = useRef(null);
  const traceFormRef = useRef(null);
  const scrollRef = useRef(null);
  const submitModeRef = useRef('close');

  // Modal State
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [archiveViewMode, setArchiveViewMode] = useState('grouped');
  const [archiveFocusedTime, setArchiveFocusedTime] = useState(null);
  const [timeNodePreviewIndex, setTimeNodePreviewIndex] = useState({});

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formItemId, setFormItemId] = useState('');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [formTime, setFormTime] = useState('');
  const [formDiscord, setFormDiscord] = useState('');
  const [formChars, setFormChars] = useState([]);
  const [formNote, setFormNote] = useState('');
  const [formSubstats, setFormSubstats] = useState([]);
  const [formMainStat, setFormMainStat] = useState('');
  const [charSearch, setCharSearch] = useState('');
  const [formPurpleCount, setFormPurpleCount] = useState(0);
  const [formBlueCount, setFormBlueCount] = useState(0);

  const [submitStatus, setSubmitStatus] = useState({ type: '', msg: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchAddedCount, setBatchAddedCount] = useState(0);
  const [presetFlags, setPresetFlags] = useState(() =>
    readStorageJson(CAVERN_PRESET_FLAGS_KEY, {
      keepItem: true,
      keepTeam: true,
      keepDiscord: true,
      keepMainStat: false
    })
  );
  const [entryPreset, setEntryPreset] = useState(() =>
    readStorageJson(CAVERN_PRESET_DATA_KEY, {
      discord: '',
      team: [],
      relics: { itemId: '', mainStat: '' },
      traces: { itemId: '' }
    })
  );
  const [teamPresets, setTeamPresets] = useState(() =>
    readStorageJson(CAVERN_TEAM_PRESETS_KEY, [])
  );
  const [teamPresetName, setTeamPresetName] = useState('');
  const [teamPresetPage, setTeamPresetPage] = useState(0);
  const [recentItemsByCategory, setRecentItemsByCategory] = useState(() =>
    readStorageJson(CAVERN_RECENT_ITEMS_KEY, { relics: [], traces: [] })
  );
  const [recentTeams, setRecentTeams] = useState(() =>
    readStorageJson(CAVERN_RECENT_TEAMS_KEY, [])
  );
  const [modalRarityFilter, setModalRarityFilter] = useState(null);
  const [resetTimer, setResetTimer] = useState('');

  const getTimeUntilReset = () => {
    const now = new Date();
    const nextReset = new Date();
    nextReset.setUTCHours(4, 0, 0, 0);
    const day = nextReset.getUTCDay(); 
    // If it's Monday but before 4 AM UTC, target today. Otherwise target next Monday.
    let diff = (1 - day + 7) % 7;
    if (diff === 0 && now.getUTCHours() >= 4) diff = 7;
    nextReset.setUTCDate(nextReset.getUTCDate() + diff);

    const dist = nextReset.getTime() - now.getTime();
    if (dist <= 0) return "00:00:00";

    const d = Math.floor(dist / (1000 * 60 * 60 * 24));
    const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((dist % (1000 * 60)) / 1000);

    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `in ${m}m ${s}s`;
  };

  useEffect(() => {
    setResetTimer(getTimeUntilReset());
    const interval = setInterval(() => setResetTimer(getTimeUntilReset()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      setArchiveViewMode('grouped');
      setArchiveFocusedTime(null);
      setTimeNodePreviewIndex({});
    }
  }, [selectedDomain?.id]);

  useEffect(() => {
    if (!isFormOpen) {
      setIsBatchMode(false);
      setBatchAddedCount(0);
    }
  }, [isFormOpen]);

  useEffect(() => {
    localStorage.setItem(CAVERN_PRESET_FLAGS_KEY, JSON.stringify(presetFlags));
  }, [presetFlags]);

  useEffect(() => {
    localStorage.setItem(CAVERN_PRESET_DATA_KEY, JSON.stringify(entryPreset));
  }, [entryPreset]);

  useEffect(() => {
    localStorage.setItem(CAVERN_TEAM_PRESETS_KEY, JSON.stringify(teamPresets));
  }, [teamPresets]);

  useEffect(() => {
    localStorage.setItem(CAVERN_RECENT_ITEMS_KEY, JSON.stringify(recentItemsByCategory));
  }, [recentItemsByCategory]);

  useEffect(() => {
    localStorage.setItem(CAVERN_RECENT_TEAMS_KEY, JSON.stringify(recentTeams));
  }, [recentTeams]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(teamPresets.length / TEAM_PRESETS_PAGE_SIZE) - 1);
    setTeamPresetPage(prev => Math.min(prev, maxPage));
  }, [teamPresets.length]);

  useEffect(() => {
    if (!isFormOpen) return;
    if (presetFlags.keepItem) {
      const presetItemId = category === 'traces' ? entryPreset.traces?.itemId : entryPreset.relics?.itemId;
      if (presetItemId) setFormItemId(presetItemId);
    }
    if (presetFlags.keepTeam && Array.isArray(entryPreset.team) && entryPreset.team.length) {
      setFormChars(entryPreset.team.slice(0, 4));
    }
    if (presetFlags.keepDiscord && entryPreset.discord) {
      setFormDiscord(entryPreset.discord);
    }
    if (category === 'relics' && presetFlags.keepMainStat && entryPreset.relics?.mainStat) {
      setFormMainStat(entryPreset.relics.mainStat);
    }
  }, [isFormOpen]);

  useEffect(() => {
    if (!isFormOpen) return;
    if (presetFlags.keepItem) {
      const presetItemId = category === 'traces' ? entryPreset.traces?.itemId : entryPreset.relics?.itemId;
      if (presetItemId) setFormItemId(presetItemId);
    }
    if (category === 'relics' && presetFlags.keepMainStat && entryPreset.relics?.mainStat) {
      setFormMainStat(entryPreset.relics.mainStat);
    }
  }, [category]);

  const SUBSTATS_LIST = [
    'Flat HP', 'Flat ATK', 'Flat DEF',
    'HP%', 'ATK%', 'DEF%',
    'SPD', 'CRIT Rate', 'CRIT DMG',
    'Effect Hit Rate', 'Effect RES', 'Break Effect'
  ];

  const MAIN_STATS = {
    'Head': ['Flat HP'],
    'Hands': ['Flat ATK'],
    'Body': ['CRIT Rate', 'CRIT DMG', 'Outgoing Healing Boost', 'Effect Hit Rate', 'ATK%', 'DEF%', 'HP%'],
    'Feet': ['SPD', 'ATK%', 'DEF%', 'HP%', 'Break Effect'],
    'Planar Sphere': ['Physical DMG', 'Fire DMG', 'Ice DMG', 'Wind DMG', 'Lightning DMG', 'Quantum DMG', 'Imaginary DMG', 'ATK%', 'DEF%', 'HP%'],
    'Link Rope': ['Energy Regeneration Rate', 'Break Effect', 'ATK%', 'DEF%', 'HP%']
  };

  const toggleSubstat = (stat) => {
    if (formSubstats.includes(stat)) {
      setFormSubstats(prev => prev.filter(s => s !== stat));
    } else if (formSubstats.length >= 4) {
      notify('Maximum 4 substats allowed.', 'error');
    } else {
      setFormSubstats(prev => [...prev, stat]);
    }
  };

  const handleSwitchCategory = (newCat) => {
    if (newCat === category) return;
    setCategory(newCat);

    // Keep sticky fields when enabled, otherwise reset.
    if (!presetFlags.keepItem) {
      setFormItemId('');
    } else {
      const presetItemId = newCat === 'traces' ? entryPreset.traces?.itemId : entryPreset.relics?.itemId;
      if (presetItemId) setFormItemId(presetItemId);
    }
    if (!presetFlags.keepTeam) {
      setFormChars([]);
    }
    if (!presetFlags.keepDiscord) {
      setFormDiscord('');
    }

    // Main stat only applies to relics; preserve only when requested.
    if (newCat !== 'relics') {
      setFormMainStat('');
    } else if (!presetFlags.keepMainStat) {
      setFormMainStat('');
    } else if (entryPreset.relics?.mainStat) {
      setFormMainStat(entryPreset.relics.mainStat);
    }

    // Always reset per-entry fields.
    setFormSubstats([]);
    setFormPurpleCount(0);
    setFormBlueCount(0);
    setFormTime('');
    setFormNote('');
    setSubmitStatus({ type: '', msg: '' });
    setModalRarityFilter(null);
  };

  const fetchClears = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();

      data.sort((a, b) => {
        if (a.clearTime === b.clearTime) return b.verifiedCount - a.verifiedCount;
        return a.clearTime.localeCompare(b.clearTime);
      });

      setClears(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClears();
    
    // Auto-verify saved password on mount
    if (adminPass) {
      console.log('[Cavern Admin] Verifying saved access code (POST)...');
      fetch(GUIDES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verify: adminPass })
      })
        .then(res => res.json())
        .then(data => {
          if (!data.valid) {
            console.warn('[Cavern Admin] Saved access code no longer valid. Clearing session.');
            setAdminPass('');
            localStorage.removeItem('hsr_admin_pass');
            notify('Admin Session Expired', 'error');
          } else {
            console.log('[Cavern Admin] Admin session verified.');
          }
        })
        .catch(() => console.error('[Cavern Admin] Security check failed during mount.'));
    }
  }, []);

  // Animations when changing categories or filter
  useEffect(() => {
    if (!loading) {
      gsap.fromTo(".domain-card",
        { y: 15, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.3, stagger: 0.02, ease: "power2.out" }
      );
    }
  }, [loading, category, activeFilters, rarityFilter]);

  // Tracer Form Entrance GSAP
  useEffect(() => {
    if (category === 'traces' && traceFormRef.current) {
      gsap.fromTo(traceFormRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }
      );
    }
  }, [category]);

  // Form Submission
  // GSAP: Modal Entrance Animation
  useEffect(() => {
    if (isFormOpen && formRef.current) {
      // Background fade-in
      gsap.fromTo(".modal-overlay",
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power2.out" }
      );

      // Modal container slide/scale/tilt
      gsap.fromTo(formRef.current,
        { scale: 0.9, y: 30, opacity: 0, rotateX: -5 },
        { scale: 1, y: 0, opacity: 1, rotateX: 0, duration: 0.6, ease: "back.out(1.5)", delay: 0.1 }
      );

      // Stagger sections
      gsap.fromTo(".modal-section",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power2.out", delay: 0.3 }
      );
    }
  }, [isFormOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus({ type: '', msg: '' });
    const keepOpenForNext = isBatchMode || submitModeRef.current === 'continue';
    submitModeRef.current = 'close';

    if (!formItemId || !formTime || !formDiscord) {
      return setSubmitStatus({ type: 'error', msg: 'Please complete all steps.' });
    }
    if (formChars.length !== 4) {
      return setSubmitStatus({ type: 'error', msg: 'Assemble a team of 4.' });
    }

    // For Traces, we mandatory purple count. For Relics, we need substats.
    if (category === 'relics' && formSubstats.length === 0) {
      return setSubmitStatus({ type: 'error', msg: 'At least 1 substat must be selected.' });
    }
    if (category === 'traces' && formPurpleCount < 1) {
      return setSubmitStatus({ type: 'error', msg: 'Report at least 1 purple drop.' });
    }

    try {
      setSubmitting(true);

      const payloadSubstats = category === 'traces'
        ? [`Purple:${formPurpleCount}`, `Blue:${formBlueCount}`]
        : formSubstats;
      const submittedCategory = category;
      const submittedItemId = formItemId;
      const submittedChars = [...formChars];
      const submittedDiscord = formDiscord.trim();
      const submittedMainStat = formMainStat || '';

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relicId: formItemId,
          clearTime: formTime,
          characters: formChars,
          discordUser: formDiscord,
          note: formNote || undefined,
          substats: payloadSubstats,
          mainStat: formMainStat || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      // Save secret key for deletion
      if (data.reportId && data.secretKey) {
        const newKeys = { ...userKeys, [data.reportId]: data.secretKey };
        setUserKeys(newKeys);
        localStorage.setItem('hsr_user_keys', JSON.stringify(newKeys));
      }

      setSubmitStatus({ type: 'success', msg: data.message });
      setEntryPreset(prev => ({
        ...prev,
        discord: submittedDiscord || prev.discord,
        team: submittedChars.length ? submittedChars : prev.team,
        relics: {
          ...prev.relics,
          itemId: submittedCategory === 'relics' ? (submittedItemId || prev.relics.itemId) : prev.relics.itemId,
          mainStat: submittedCategory === 'relics' ? (submittedMainStat || prev.relics.mainStat) : prev.relics.mainStat
        },
        traces: {
          ...prev.traces,
          itemId: submittedCategory === 'traces' ? (submittedItemId || prev.traces.itemId) : prev.traces.itemId
        }
      }));
      addRecentItem(submittedCategory, submittedItemId);
      addRecentTeam(submittedChars, submittedItemId, submittedCategory);
      if (keepOpenForNext) {
        setBatchAddedCount(prev => prev + 1);
      }

      // OPTIMISTIC UI UPDATE
      const newReport = {
        relicId: formItemId,
        clearTime: formTime,
        characters: formChars,
        verifiedCount: 1,
        reporters: [formDiscord.trim()],
        reports: [{
          id: data.reportId,
          key: data.secretKey,
          reporter: formDiscord.trim(),
          note: formNote || undefined,
          substats: payloadSubstats,
          mainStat: formMainStat || undefined
        }]
      };

      setClears(prev => {
        const charactersSorted = [...formChars].sort().join(',');
        const substatsSorted = [...payloadSubstats].sort().join(',');

        const existingIndex = prev.findIndex(entry =>
          entry.relicId === formItemId &&
          entry.clearTime === formTime &&
          [...entry.characters].sort().join(',') === charactersSorted &&
          ((entry.substats || (entry.reports?.[0]?.substats)) && [...(entry.substats || entry.reports[0].substats)].sort().join(',') === substatsSorted)
        );

        if (existingIndex >= 0) {
          const updatedClears = [...prev];
          const existing = { ...updatedClears[existingIndex] };
          existing.verifiedCount += 1;
          if (!existing.reporters.includes(formDiscord.trim())) {
            existing.reporters.push(formDiscord.trim());
          }
          if (!existing.reports) existing.reports = [];
          existing.reports.push(newReport.reports[0]);
          updatedClears[existingIndex] = existing;
          return updatedClears;
        } else {
          return [...prev, { ...newReport, substats: payloadSubstats }];
        }
      });

      setTimeout(() => {
        if (!keepOpenForNext) {
          setIsFormOpen(false);
        }
        // fetchClears(); -> We remove this here to prevent the Vercel Blob race condition
        setFormTime('');
        setFormNote('');
        setFormSubstats([]);
        setFormPurpleCount(0);
        setFormBlueCount(0);
        setShowItemSelector(false);
        if (!presetFlags.keepTeam) {
          setFormChars([]);
        }
        if (!presetFlags.keepDiscord) {
          setFormDiscord('');
        }
        if (!presetFlags.keepItem) {
          setFormItemId('');
        }
        if (submittedCategory === 'relics' && !presetFlags.keepMainStat) {
          setFormMainStat('');
        }
        if (keepOpenForNext) {
          setSubmitStatus({ type: 'success', msg: 'Record logged. Ready for next entry.' });
        }
      }, 1500);

    } catch (err) {
      setSubmitStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const currentItemData = category === 'relics' ? relicsData : materialsData;
  const getItem = (id) => [...relicsData, ...materialsData].find(r => r.id === id) || { name: 'Unknown', image: '' };
  const getCharData = (id) => charactersData.find(c => c.id === id) || { name: '', image: '', rarity: 4 };
  const getCharImg = (id) => getCharData(id).image;
  const teamPresetPageCount = Math.max(1, Math.ceil(teamPresets.length / TEAM_PRESETS_PAGE_SIZE));
  const teamPresetSliceStart = teamPresetPage * TEAM_PRESETS_PAGE_SIZE;
  const visibleTeamPresets = teamPresets.slice(teamPresetSliceStart, teamPresetSliceStart + TEAM_PRESETS_PAGE_SIZE);

  const toggleFilter = (id) => {
    setActiveFilters(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleChar = (charId, e) => {
    if (formChars.includes(charId)) {
      setFormChars(formChars.filter(id => id !== charId));
    } else if (formChars.length < 4) {
      setFormChars([...formChars, charId]);

      // GSAP Animation: Dramatic Entrance on the Squad Slot
      const slotIndex = formChars.length;
      setTimeout(() => {
        gsap.fromTo(`.slot-anim-${slotIndex}`,
          { scale: 0.4, opacity: 0, y: 30, filter: 'brightness(2.5) contrast(1.5)', rotation: -10 },
          { scale: 1, opacity: 1, y: 0, filter: 'brightness(1) contrast(1)', rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" }
        );
      }, 30); // 30ms margin to ensure React re-render completes
    }
  };

  const handleDelete = async (params, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm('Are you sure you want to remove this record from the archives?')) return;

    try {
      // Strip undefined/null values so they don't become 'undefined' strings in URL
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v != null)
      );
      const searchParams = new URLSearchParams(cleanParams);

      const res = await fetch(`${API_URL}?${searchParams.toString()}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');

      // OPTIMISTIC UI: Instantly remove from local state
      const normalize = (arr) => {
        if (!arr) return '';
        const toArr = Array.isArray(arr) ? arr : String(arr).split(',');
        return toArr.map(val => String(val).trim().toLowerCase()).sort().join(',');
      };
      const normalizeTime = (t) => t ? String(t).trim().replace(/^0/, '') : '';

      if (params.reportId) {
        setClears(prev => prev.map(entry => {
          if (!entry.reports) return entry;
          return {
            ...entry,
            reports: entry.reports.filter(r => String(r.id) !== String(params.reportId)),
            verifiedCount: entry.reports.filter(r => String(r.id) !== String(params.reportId)).length
          };
        }).filter(entry => entry.reports.length > 0));
      } else if (params.relicId && params.clearTime && params.characters) {
        // Variant deletion
        const targetTime = normalizeTime(params.clearTime);
        const charsSorted = normalize(params.characters.split(','));
        const substatsSorted = params.substats && params.substats !== 'undefined' ? normalize(params.substats.split(',')) : 'none';

        setClears(prev => prev.filter(e => {
          const matchBase = String(e.relicId).trim() === String(params.relicId).trim() &&
            normalizeTime(e.clearTime) === targetTime &&
            normalize(e.characters) === charsSorted;

          if (!matchBase) return true;

          // Legacy check: e.substats or the reported sustats from first report
          const eSubstats = e.substats || (e.reports && e.reports[0] && e.reports[0].substats) || [];
          const eSubsSorted = eSubstats.length > 0 ? normalize(eSubstats) : 'none';

          if (substatsSorted !== 'none') {
            return eSubsSorted !== substatsSorted;
          }
          return false;
        }));
      } else if (params.key && !params.relicId) {
        // Wipe All
        setClears([]);
        setSelectedDomain(null);
      }

      notify(params.key && !params.relicId ? 'Archive completely purged' : 'Archive record expunged', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleTitleClick = () => {
    const newCount = titleClicks + 1;
    setTitleClicks(newCount);
    if (newCount === 5) {
      const pass = prompt('Enter Admin Access Code:');
      if (pass) {
        const trimmedPass = pass.trim();
        // Secure server-side verification via POST
        fetch(GUIDES_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verify: trimmedPass })
        })
          .then(res => res.json())
          .then(data => {
            if (data.valid) {
              setAdminPass(trimmedPass);
              localStorage.setItem('hsr_admin_pass', trimmedPass);
              notify('Admin Access Granted', 'success');
            } else {
              notify('Invalid Access Code', 'error');
            }
          })
          .catch(() => notify('Security Check Failed', 'error'));
      }
      setTitleClicks(0);
    }
  };

  const notify = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const shiftTimeNodePreview = (time, total, dir) => {
    if (!time || total <= 1) return;
    setTimeNodePreviewIndex(prev => {
      const current = prev[time] ?? 0;
      const next = (current + dir + total) % total;
      return { ...prev, [time]: next };
    });
  };

  const togglePresetFlag = (key) => {
    setPresetFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveCurrentAsPreset = () => {
    setEntryPreset(prev => ({
      ...prev,
      discord: formDiscord.trim() || prev.discord,
      team: formChars.length ? [...formChars] : prev.team,
      relics: {
        ...prev.relics,
        itemId: category === 'relics' ? (formItemId || prev.relics.itemId) : prev.relics.itemId,
        mainStat: category === 'relics' ? (formMainStat || prev.relics.mainStat) : prev.relics.mainStat
      },
      traces: {
        ...prev.traces,
        itemId: category === 'traces' ? (formItemId || prev.traces.itemId) : prev.traces.itemId
      }
    }));
    notify('Preset saved locally.', 'success');
  };

  const applySavedPreset = () => {
    const presetItemId = category === 'traces' ? entryPreset.traces?.itemId : entryPreset.relics?.itemId;
    if (presetFlags.keepItem && presetItemId) setFormItemId(presetItemId);
    if (presetFlags.keepTeam && Array.isArray(entryPreset.team) && entryPreset.team.length) {
      setFormChars(entryPreset.team.slice(0, 4));
    }
    if (presetFlags.keepDiscord && entryPreset.discord) setFormDiscord(entryPreset.discord);
    if (category === 'relics' && presetFlags.keepMainStat && entryPreset.relics?.mainStat) {
      setFormMainStat(entryPreset.relics.mainStat);
    }
    notify('Preset applied.', 'info');
  };

  const saveTeamPreset = () => {
    if (formChars.length !== 4) {
      notify('Build a full team of 4 before saving preset.', 'error');
      return;
    }

    const name = teamPresetName.trim() || `Team ${teamPresets.length + 1}`;
    const payload = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      chars: [...formChars],
      updatedAt: Date.now()
    };

    setTeamPresets(prev => {
      const existingIdx = prev.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], chars: payload.chars, updatedAt: payload.updatedAt };
        return next.sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return [payload, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
    });

    setTeamPresetPage(0);
    setTeamPresetName('');
    notify(`Team preset "${name}" saved.`, 'success');
  };

  const applyTeamPreset = (preset) => {
    if (!preset?.chars?.length) return;
    setFormChars(preset.chars.slice(0, 4));
    setPresetFlags(prev => ({ ...prev, keepTeam: true }));
    setTeamPresets(prev => prev.map(p => p.id === preset.id ? { ...p, updatedAt: Date.now() } : p).sort((a, b) => b.updatedAt - a.updatedAt));
    addRecentTeam(preset.chars.slice(0, 4), formItemId, category);
    notify(`Applied team preset "${preset.name}".`, 'info');
  };

  const deleteTeamPreset = (presetId) => {
    setTeamPresets(prev => prev.filter(p => p.id !== presetId));
    notify('Team preset removed.', 'info');
  };

  const moveTeamPresetPage = (direction) => {
    setTeamPresetPage(prev => {
      const maxPage = Math.max(0, Math.ceil(teamPresets.length / TEAM_PRESETS_PAGE_SIZE) - 1);
      return Math.max(0, Math.min(maxPage, prev + direction));
    });
  };

  const addRecentItem = (cat, itemId) => {
    if (!itemId) return;
    setRecentItemsByCategory(prev => {
      const list = Array.isArray(prev?.[cat]) ? prev[cat] : [];
      const next = [itemId, ...list.filter(id => id !== itemId)].slice(0, RECENT_ITEMS_LIMIT);
      return { ...prev, [cat]: next };
    });
  };

  const addRecentTeam = (chars, itemId, cat) => {
    if (!Array.isArray(chars) || chars.length !== 4) return;
    const signature = [...chars].join('|');
    const payload = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      chars: [...chars],
      itemId: itemId || '',
      category: cat || 'relics',
      signature,
      updatedAt: Date.now()
    };
    setRecentTeams(prev => {
      const filtered = prev.filter(t => `${t.category || 'relics'}::${t.itemId || ''}::${t.signature}` !== `${payload.category}::${payload.itemId}::${payload.signature}`);
      return [payload, ...filtered].slice(0, RECENT_TEAMS_LIMIT);
    });
  };

  const applyRecentTeam = (recent) => {
    if (!recent?.chars?.length) return;
    setFormChars(recent.chars.slice(0, 4));
    setPresetFlags(prev => ({ ...prev, keepTeam: true }));
    setRecentTeams(prev =>
      [{ ...recent, updatedAt: Date.now() }, ...prev.filter(t => t.id !== recent.id)].slice(0, RECENT_TEAMS_LIMIT)
    );
    notify('Recent team loaded.', 'info');
  };

  const resetCurrentTeam = () => {
    setFormChars([]);
    notify('Current team cleared.', 'info');
  };

  const resetAllPresetData = () => {
    if (!window.confirm('Reset all preset memory, team presets, and recent shortcuts?')) return;

    const defaultFlags = {
      keepItem: true,
      keepTeam: true,
      keepDiscord: true,
      keepMainStat: false
    };
    const defaultPreset = {
      discord: '',
      team: [],
      relics: { itemId: '', mainStat: '' },
      traces: { itemId: '' }
    };

    setPresetFlags(defaultFlags);
    setEntryPreset(defaultPreset);
    setTeamPresets([]);
    setRecentItemsByCategory({ relics: [], traces: [] });
    setRecentTeams([]);
    setTeamPresetPage(0);
    setTeamPresetName('');
    notify('All preset data reset.', 'success');
  };

  // Group clear records by time AND substats for a specific domain
  const getGroupedTimesForDomain = (domainId) => {
    const domainClears = clears.filter(c => c.relicId === domainId);
    const groups = {};

    domainClears.forEach(clear => {
      const time = clear.clearTime;
      if (!groups[time]) groups[time] = [];

      // Legacy normalization: Check top-level OR first report for stats
      const cardSubstats = clear.substats || clear.reports?.[0]?.substats || [];
      const cardMainStat = clear.mainStat || clear.reports?.[0]?.mainStat;

      const statsKey = [...cardSubstats].sort().join(',') || 'none';

      // Look for an existing card at this time with these substats
      let card = groups[time].find(c => c.statsKey === statsKey);

      if (!card) {
        card = {
          statsKey,
          substats: cardSubstats,
          mainStat: cardMainStat,
          variants: [] // This will hold multiple teams for the same substat result
        };
        groups[time].push(card);
      }

      card.variants.push(clear);
    });

    // Sort variants within each card by verifiedCount
    Object.values(groups).forEach(timeGroup => {
      timeGroup.forEach(card => {
        card.variants.sort((a, b) => b.verifiedCount - a.verifiedCount);
      });
      // Sort cards within the time block (e.g. ones with more total clears first)
      timeGroup.sort((a, b) => {
        const totalA = a.variants.reduce((sum, v) => sum + v.verifiedCount, 0);
        const totalB = b.variants.reduce((sum, v) => sum + v.verifiedCount, 0);
        return totalB - totalA;
      });
    });

    return groups;
  };

  // Filter and sort logic for main grid
  const filteredGridData = currentItemData
    .filter(item => {
      const passDomain = activeFilters.length === 0 || activeFilters.includes(item.id);
      const passRarity = !rarityFilter || item.rarity === rarityFilter;
      const passSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return passDomain && passRarity && passSearch;
    })
    .sort((a, b) => {
      // Items with clears appear first
      const aClears = clears.filter(c => c.relicId === a.id).length;
      const bClears = clears.filter(c => c.relicId === b.id).length;
      if (aClears > 0 && bClears === 0) return -1;
      if (bClears > 0 && aClears === 0) return 1;
      return 0; // Maintain original stable order otherwise
    });

  // Handle Wheel Scroll for Filter Bar
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      const onWheel = (e) => {
        if (e.deltaY === 0) return;
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => {
        el.removeEventListener('wheel', onWheel);
      }
    }
  }, [selectedDomain, isFormOpen]); // Re-attach when visibility changes

  return (
    <div className="relative flex flex-col gap-6 p-6 max-w-[95rem] mx-auto min-h-screen pb-20 font-['Outfit',sans-serif] selection:bg-purple-500/30 text-slate-100 bg-transparent">

      {/* BACKGROUND IMAGE - Theme-Driven Backdrop */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {showCavernBackdropImage && !isNeon && (
          <img
            src={`${baseUrl}${cavernTheme.backdropImage}`}
            alt="Backdrop"
            className={`w-full h-full object-cover ${cavernTheme.backdropImageClass || 'opacity-[0.22] saturate-[0.9] brightness-[0.72] blur-[1px]'}`}
          />
        )}
        {showCavernBackdropImage && isNeon && (
          <div className="cavern-neon-999-wrap absolute inset-0">
            <img
              src={`${baseUrl}${cavernTheme.backdropImage}`}
              alt="999SW left"
              className="cavern-neon-999-layer cavern-neon-999-layer-1"
            />
            <img
              src={`${baseUrl}${cavernTheme.backdropImage}`}
              alt="999SW center"
              className="cavern-neon-999-layer cavern-neon-999-layer-2"
            />
            <img
              src={`${baseUrl}${cavernTheme.backdropImage}`}
              alt="999SW right"
              className="cavern-neon-999-layer cavern-neon-999-layer-3"
            />
          </div>
        )}
        <div className={`absolute inset-0 bg-gradient-to-b ${cavernOverlayClass}`} />
      </div>

      {isGlacial && <ArcticSnow particleCount={40} speedScale={0.5} />}

      <div className="relative z-10"> {/* Content Wrapper */}

        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&display=swap" rel="stylesheet" />

        {/* Hero Section */}
        <div className="relative pt-2 pb-1">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[400px] bg-gradient-to-b from-purple-600/10 via-transparent to-transparent blur-[100px] pointer-events-none -z-10"></div>
          <div className="flex flex-col items-center text-center gap-2">
            <h1
              onClick={handleTitleClick}
              className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none italic uppercase cursor-pointer select-none"
            >
              The Drop <span className={`text-transparent bg-clip-text ${isGlacial ? 'bg-gradient-to-br from-cyan-400 to-blue-500' : 'bg-gradient-to-br from-indigo-400 to-emerald-400'} pr-3`}>Archives</span>
            </h1>
            {adminPass && (
              <div className="flex items-center gap-3">
                <div
                  onClick={() => {
                    if (window.confirm('Exit Admin Mode?')) {
                      setAdminPass('');
                      localStorage.removeItem('hsr_admin_pass');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1 bg-amber-500 text-black text-[10px] font-black uppercase rounded-full tracking-widest animate-pulse cursor-pointer hover:bg-amber-400 transition-colors"
                >
                  <Trophy className="w-3 h-3" /> Admin Mode Active
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('🚨 WARNING: This will permanently EXTERMINATE ALL ARCHIVE RECORDS. Proceed?')) {
                      handleDelete({ key: adminPass }, true);
                    }
                  }}
                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-500 hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Nuke All
                </button>
              </div>
            )}
            <p className="max-w-xl text-slate-400 text-sm md:text-base font-medium leading-relaxed mt-2">
              Technical execution records and pattern mapping. Select a domain to investigate.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div 
          className={`cavern-toolbar-shell flex flex-col gap-4 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-6 pt-6 rounded-[2.5rem] border border-white/5 shadow-2xl sticky z-40 theme-glass-card overflow-hidden ${themeConfig.caverns.toolbarStickyClass}`}
          style={{ '--card-radius': '2.5rem' }}
        >
          <div className="relative z-20 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto overflow-hidden">
              <button
                onClick={() => { setCategory('relics'); setFormItemId(''); setIsFormOpen(false); setActiveFilters([]); setRarityFilter(null); }}
                className={`flex-1 md:flex-none px-8 py-3 rounded-[1rem] font-black text-xs md:text-sm uppercase tracking-widest transition-all cursor-pointer ${category === 'relics' ? themeConfig.caverns.relicActiveClass : themeConfig.caverns.inactiveChipClass}`}
              >
                📦 Relics & Planars
              </button>
              <button
                onClick={() => { setCategory('traces'); setFormItemId(''); setIsFormOpen(false); setActiveFilters([]); setRarityFilter(null); }}
                className={`flex-1 md:flex-none px-8 py-3 rounded-[1rem] font-black text-xs md:text-sm uppercase tracking-widest transition-all cursor-pointer ${category === 'traces' ? themeConfig.caverns.traceActiveClass : themeConfig.caverns.inactiveChipClass}`}
              >
                ⚡ Traces / Mats
              </button>
            </div>

            <div className="flex-1 max-w-md w-full flex flex-col gap-2">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search domains..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="theme-input w-full rounded-2xl py-3.5 pl-10 pr-10 text-xs font-bold outline-none"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2 pl-2">
                <Clock className="w-3 h-3 text-slate-500" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500/80">
                  Archives Reset Weekly (Mon 06:00). Next wipe in: <span className="text-white ml-1 font-mono">{resetTimer}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <button
                onClick={fetchClears}
                className="theme-action-secondary p-4 rounded-2xl transition-all cursor-pointer group shrink-0"
                title="Sync Database"
              >
                <RefreshCw className={`w-5 h-5 text-slate-400 group-hover:text-white ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { setIsFormOpen(!isFormOpen); setSelectedDomain(null); setSubmitStatus({ type: '', msg: '' }); }}
                className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs md:text-sm uppercase tracking-widest cursor-pointer ${themeConfig.caverns.addButtonClass}`}
              >
                {isFormOpen ? <X className="w-5 h-5 shrink-0" /> : <PlusCircle className="w-5 h-5 shrink-0" />}
                {isFormOpen ? 'Close Portal' : 'Add New Record'}
              </button>
            </div>
          </div>

          {/* Multi-Select Quick Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 pt-3 border-t border-white/5">

            {/* Rarity Filter - ONLY FOR TRACES */}
            {category === 'traces' && (
              <div className="flex items-center gap-4 animate-in slide-in-from-left-4">
                <div className="flex items-center gap-2 text-slate-500 shrink-0">
                  <Star className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Rarity Filter</span>
                </div>
                <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                  {[1, 2, 3, 4].map(r => (
                    <button
                      key={r}
                      onClick={() => setRarityFilter(prev => prev === r ? null : r)}
                      className={`px-4 py-2 rounded-lg font-black text-xs uppercase transition-all cursor-pointer ${rarityFilter === r ? themeConfig.caverns.rarityActiveClass : themeConfig.caverns.inactiveChipClass}`}
                    >
                      {r}★
                    </button>
                  ))}
                </div>
              </div>
            )}

            {category === 'traces' && <div className="h-10 w-px bg-white/5 hidden lg:block mx-2"></div>}

            {/* Domain Filter */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4 min-w-0 overflow-x-hidden overflow-y-visible">
              <div className="flex items-center gap-2 text-slate-500 shrink-0">
                <Filter className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Domain Filter</span>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 flex gap-2 overflow-x-auto overflow-y-visible pb-2 custom-scrollbar mask-fade-right cursor-ew-resize"
              >
                {currentItemData.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleFilter(item.id)}
                    className={`cavern-filter-chip group/filter relative flex-shrink-0 w-10 h-10 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center p-1.5 ${activeFilters.includes(item.id) ? 'border-indigo-500 bg-indigo-500/20 scale-110 shadow-lg shadow-indigo-500/20' : 'border-white/5 bg-black/20 hover:border-white/20'}`}
                  >
                    <div className={`cavern-filter-tooltip absolute left-1/2 -top-10 -translate-x-1/2 px-3 py-1.5 font-bold text-[10px] text-white rounded-xl opacity-0 group-hover/filter:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap scale-75 group-hover/filter:scale-100 origin-bottom ${
                      category === 'traces'
                        ? 'bg-emerald-600 border border-emerald-400/30 shadow-[0_4px_20px_rgba(16,185,129,0.4)]'
                        : 'bg-indigo-600 border border-indigo-400/30 shadow-[0_4px_20px_rgba(79,70,229,0.4)]'
                    }`}>
                      {item.name}
                      <div className={`absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent ${category === 'traces' ? 'border-t-emerald-600' : 'border-t-indigo-600'}`}></div>
                    </div>
                    <VisualIcon src={item.image} name={item.name} className="w-full h-full" />
                  </div>
                ))}
              </div>

              {(activeFilters.length > 0 || rarityFilter) && (
                <button
                  onClick={() => { setActiveFilters([]); setRarityFilter(null); }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all cursor-pointer h-10 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

        {isFormOpen && (
          <div className="theme-modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pt-16 sm:pt-20 transition-all modal-overlay">
            <div
              ref={formRef}
              className={`theme-modal-shell cavern-entry-modal w-full max-w-5xl max-h-[85vh] rounded-[2.5rem] flex flex-col overflow-hidden relative perspective-1000 ${isGlacial ? 'glacial-subtle-snow cavern-winter-shell' : ''}`}
            >
              {/* Modal Header */}
              <div className="theme-modal-header flex items-center justify-between p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0"></div>
                <div className="flex items-center gap-6">
                  <div className="theme-badge-accent theme-accent-glow flex h-14 w-14 items-center justify-center rounded-2xl">
                    <PlusCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none mb-1">Data Entry Portal</h2>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">Sync Protocol v4.0.2 Active</p>
                      </div>
                      
                      <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
                      
                      {/* QUICK NAV SWITCH */}
                      <div className="theme-subpanel flex items-center rounded-xl p-1 gap-1 shadow-inner overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleSwitchCategory('relics')}
                          className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer ${category === 'relics' ? themeConfig.caverns.rarityActiveClass : themeConfig.caverns.inactiveChipClass}`}
                        >
                          <Trophy className="w-3 h-3" />
                          Relics
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchCategory('traces')}
                          className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer ${category === 'traces' ? themeConfig.caverns.traceActiveClass : themeConfig.caverns.inactiveChipClass}`}
                        >
                          <Sparkles className="w-3 h-3" />
                          Traces
                        </button>
                      </div>

                      <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsBatchMode(prev => {
                            if (prev) setBatchAddedCount(0);
                            if (!prev) {
                              setTimeout(() => {
                                applySavedPreset();
                              }, 0);
                            }
                            return !prev;
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer border ${
                          isBatchMode
                            ? themeConfig.caverns.traceActiveClass
                            : 'theme-action-secondary text-slate-400 border-white/10 hover:text-white'
                        }`}
                        title="Batch mode keeps the modal open after each save"
                      >
                        <Users className="w-3 h-3" />
                        Batch Mode {isBatchMode ? 'On' : 'Off'}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="theme-icon-button w-14 h-14 rounded-full flex items-center justify-center transition-all border cursor-pointer group shadow-2xl hover:bg-[color:var(--theme-accent)] hover:text-[color:var(--theme-accent-contrast)]"
                >
                  <X className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-transparent">
                <div className={`${submitting ? 'animate-pulse' : ''} relative`}>
                  {submitting && (
                    <div className="absolute inset-x-0 -top-12 h-1.5 bg-black/60 overflow-hidden z-50 rounded-full">
                      <div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 w-full animate-progress-long"></div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className={`flex flex-col gap-12 ${submitting ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="theme-subpanel modal-section rounded-[1.5rem] p-4 sm:p-5 flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.22em]">Sticky Preset Memory</h3>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.16em] mt-1">Reuse cavern/team/discord between entries</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveCurrentAsPreset}
                            className="px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-wider hover:bg-amber-500/20 transition-all cursor-pointer"
                          >
                            Save Current
                          </button>
                          <button
                            type="button"
                            onClick={applySavedPreset}
                            className="px-3 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/20 transition-all cursor-pointer"
                          >
                            Apply Preset
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => togglePresetFlag('keepItem')}
                          className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            presetFlags.keepItem
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                              : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Keep Cavern
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePresetFlag('keepTeam')}
                          className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            presetFlags.keepTeam
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                              : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Keep Team
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePresetFlag('keepDiscord')}
                          className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            presetFlags.keepDiscord
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                              : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Keep Discord
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePresetFlag('keepMainStat')}
                          className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            presetFlags.keepMainStat
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                              : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Keep Main Stat
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="flex flex-col gap-6 modal-section relative z-[60]">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black">01</span>
                          <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Select Target</h3>
                        </div>
                        <div className="relative">
                          <div
                            onClick={() => setShowItemSelector(!showItemSelector)}
                            className={`flex items-center justify-between p-6 bg-white/[0.03] backdrop-blur-sm shadow-[inset_0_0_15px_rgba(255,255,255,0.02)] border border-white/10 rounded-[1.5rem] cursor-pointer transition-all hover:bg-white/[0.08] ${showItemSelector ? 'border-amber-500/80 ring-4 ring-amber-500/20' : 'hover:border-white/20'}`}
                          >
                            {formItemId ? (
                              <div className="flex items-center gap-4">
                                <VisualIcon src={getItem(formItemId).image} name={getItem(formItemId).name} className="w-14 h-14" />
                                <span className="text-white font-black text-xl md:text-2xl tracking-tight">{getItem(formItemId).name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 font-medium">Select a {category === 'relics' ? 'Domain' : 'Material'}...</span>
                            )}
                            <ChevronDown className={`w-6 h-6 text-slate-500 transition-transform ${showItemSelector ? 'rotate-180' : ''}`} />
                          </div>
                          {showItemSelector && (
                            <div className="absolute top-[calc(100%+16px)] left-0 right-0 z-50 bg-[#050b1a]/95 backdrop-blur-3xl border border-blue-500/30 rounded-[2.5rem] shadow-[0_20px_80px_rgba(0,0,0,0.9)] max-h-[450px] overflow-y-auto custom-scrollbar flex flex-col">
                              {category === 'traces' && (
                                <div className="flex items-center justify-center gap-3 p-4 border-b border-white/5 bg-white/5 sticky top-0 z-[70] backdrop-blur-md">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Filter Grade</span>
                                  {[1, 2, 3, 4].map(star => {
                                    const colors = {
                                      1: 'border-slate-500/30 text-slate-400 hover:bg-slate-500/10',
                                      2: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
                                      3: 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10',
                                      4: 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                                    };
                                    const activeColors = {
                                      1: 'bg-slate-500 text-white border-slate-400',
                                      2: 'bg-emerald-500 text-white border-emerald-400',
                                      3: 'bg-cyan-500 text-white border-cyan-400',
                                      4: 'bg-purple-500 text-white border-purple-400'
                                    };
                                    return (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setModalRarityFilter(modalRarityFilter === star ? null : star)}
                                        className={`px-3 py-1 rounded-full border text-[10px] font-black transition-all cursor-pointer ${modalRarityFilter === star ? activeColors[star] : colors[star]}`}
                                      >
                                        {star}★
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 gap-4 p-6 pt-12 pb-8 w-full">
                                {currentItemData.filter(item => !modalRarityFilter || item.rarity === modalRarityFilter).map(item => (
                                  <div
                                    key={item.id}
                                    onClick={() => {
                                      setFormItemId(item.id);
                                      addRecentItem(category, item.id);
                                      setShowItemSelector(false);
                                    }}
                                    className={`flex flex-col items-center p-3 rounded-2xl cursor-pointer border-2 transition-all duration-300 relative group hover:-translate-y-1.5 hover:shadow-xl hover:border-white/40 ${formItemId === item.id ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)] z-10' : 'border-white/5'} ${
                                      category === 'traces' ? (
                                        item.rarity === 4 ? 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20' :
                                        item.rarity === 3 ? 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20' :
                                        item.rarity === 2 ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' :
                                        'bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20'
                                      ) : 'bg-blue-900/10 hover:bg-blue-400/10'
                                    }`}
                                  >
                                    <div className="absolute left-1/2 -top-10 -translate-x-1/2 px-3 py-1.5 bg-blue-600 font-bold text-[10px] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] whitespace-nowrap shadow-[0_4px_20px_rgba(37,99,235,0.4)] scale-75 group-hover:scale-100 origin-bottom border border-blue-400/30">
                                      {item.name}
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-blue-600"></div>
                                    </div>
                                    {formItemId === item.id && <div className="absolute inset-0 bg-amber-500/10 mix-blend-overlay rounded-2xl"></div>}
                                    <VisualIcon src={item.image} name={item.name} className="w-full aspect-square relative z-10 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {Array.isArray(recentItemsByCategory[category]) && recentItemsByCategory[category].length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Recent Caverns</span>
                            <div className="flex flex-wrap gap-2">
                              {recentItemsByCategory[category].slice(0, 6).map((id) => {
                                const it = getItem(id);
                                return (
                                  <button
                                    key={`recent-item-${category}-${id}`}
                                    type="button"
                                    onClick={() => {
                                      setFormItemId(id);
                                      addRecentItem(category, id);
                                    }}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                                      formItemId === id
                                        ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                                        : 'border-white/10 bg-black/25 text-slate-300 hover:border-white/20'
                                    }`}
                                  >
                                    <div className="w-6 h-6 rounded-lg overflow-hidden">
                                      <VisualIcon src={it.image} name={it.name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em] max-w-[120px] truncate">{it.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="flex flex-col gap-2 relative text-slate-500">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 font-black">@</div>
                            <input
                              type="text"
                              required
                              placeholder="Discord Username"
                              value={formDiscord}
                              onChange={e => setFormDiscord(e.target.value)}
                              className="w-full bg-white/[0.03] backdrop-blur-sm shadow-[inset_0_0_15px_rgba(255,255,255,0.02)] border border-white/10 rounded-[1.5rem] p-5 pl-12 text-white font-black outline-none focus:border-amber-500/50 focus:bg-white/[0.08] transition-all placeholder:text-slate-500 cursor-text hover:bg-white/[0.08] hover:border-white/20"
                            />
                          </div>
                          <div className="flex flex-col gap-2 relative">
                            <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
                            <input
                              type="text"
                              required
                              placeholder="MM:SS"
                              value={formTime}
                              onChange={e => setFormTime(e.target.value)}
                              className="w-full bg-white/[0.03] backdrop-blur-sm shadow-[inset_0_0_15px_rgba(255,255,255,0.02)] border border-white/10 rounded-[1.5rem] p-5 pl-14 text-white font-mono text-xl md:text-2xl font-black outline-none focus:border-amber-500/50 focus:bg-white/[0.08] transition-all placeholder:text-slate-500 cursor-text hover:bg-white/[0.08] hover:border-white/20"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 relative mt-2">
                          <Info className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
                          <input
                            type="text"
                            placeholder="Optional Note / Time Range (max 40 chars)"
                            maxLength={40}
                            value={formNote}
                            onChange={e => setFormNote(e.target.value)}
                            className="w-full bg-white/[0.03] backdrop-blur-sm shadow-[inset_0_0_15px_rgba(255,255,255,0.02)] border border-white/10 rounded-[1.5rem] p-4 pl-14 text-white font-medium outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all placeholder:text-slate-500 cursor-text hover:bg-white/[0.08] hover:border-white/20"
                          />
                        </div>
                      </div>
                      {/* --- START OF RIGHT COLUMN: MAIN STAT & SUBSTATS --- */}
                      <div className="flex flex-col gap-8 modal-section">
                        {category === 'relics' && (
                          <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black">02</span>
                              <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Main Stat <span className="text-slate-600 ml-2">(Optional)</span></h3>
                            </div>
                            <div className="relative">
                              <select
                                value={formMainStat}
                                onChange={e => setFormMainStat(e.target.value)}
                                className="w-full bg-white/[0.03] backdrop-blur-sm shadow-[inset_0_0_15px_rgba(255,255,255,0.02)] border border-white/10 rounded-[1.5rem] p-4 text-white font-medium outline-none focus:border-orange-500/50 focus:bg-white/[0.08] appearance-none cursor-pointer transition-all hover:bg-white/[0.08] hover:border-white/20"
                              >
                                <option value="" className="bg-slate-900 text-slate-400">-- None Selected (Unknown Piece) --</option>
                                {Object.entries(MAIN_STATS).map(([piece, stats]) => (
                                  <optgroup key={piece} label={`=== ${piece} ===`} className="bg-slate-900 text-orange-400 font-bold mb-2">
                                    {stats.map(stat => <option key={`${piece}: ${stat}`} value={`${piece}: ${stat}`} className="text-white bg-slate-800 font-normal">{stat}</option>)}
                                  </optgroup>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-5">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-black">{category === 'relics' ? '03' : '02'}</span>
                            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
                              {category === 'relics' ? 'Substats' : 'Drop Intelligence'}
                              <span className={`${category === 'relics' ? 'text-red-400/80' : 'text-slate-500'} ml-2`}>
                                {category === 'relics' ? '(Min 1, Max 4)' : '(Enter Drops)'}
                              </span>
                            </h3>
                          </div>

                          {category === 'relics' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2">
                              {SUBSTATS_LIST.map(stat => {
                                const isSelected = formSubstats.includes(stat);
                                return (
                                  <div
                                    key={stat}
                                    onClick={() => toggleSubstat(stat)}
                                    className={`px-3 py-3 text-[11px] font-black uppercase tracking-wider text-center rounded-xl border-2 transition-all cursor-pointer select-none
                                    ${isSelected
                                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                                        : 'bg-black/40 text-slate-500 border-white/5 hover:border-white/20 hover:text-slate-300'}`}
                                  >
                                    {stat}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4 lg:gap-6 w-full" ref={traceFormRef}>
                              <div className="flex flex-col gap-4 relative">
                                <span className="text-[10px] sm:text-xs font-black text-purple-400 uppercase tracking-[0.2em] px-2 text-center">Epic Tier</span>
                                <div className="relative group/input">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-black/60 border border-purple-500/30 flex items-center justify-center pointer-events-none">
                                    {(() => {
                                      const base = materialsData.find(m => m.id === formItemId);
                                      const baseNumId = base ? String(base.numId).slice(0, -1) : '';
                                      const purpleIcon = materialsData.find(m => String(m.numId) === baseNumId + '3') || base;
                                      return <VisualIcon src={purpleIcon?.image} name="purple" className="w-10 h-10 object-contain" />;
                                    })()}
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={formPurpleCount}
                                    onChange={e => setFormPurpleCount(parseInt(e.target.value) || 0)}
                                    className="w-full bg-purple-500/5 hover:bg-purple-500/10 focus:bg-purple-500/15 border-[3px] border-purple-500/10 focus:border-purple-500/50 rounded-[2rem] p-6 pl-24 text-white font-black text-5xl outline-none transition-all font-mono shadow-[0_0_20px_rgba(168,85,247,0.1)] focus:shadow-[0_0_40px_rgba(168,85,247,0.3)] text-center"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col gap-4 relative">
                                <span className="text-[10px] sm:text-xs font-black text-cyan-400 uppercase tracking-[0.2em] px-2 text-center">Rare Tier</span>
                                <div className="relative group/input">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-black/60 border border-cyan-500/30 flex items-center justify-center pointer-events-none">
                                    {(() => {
                                      const base = materialsData.find(m => m.id === formItemId);
                                      const baseNumId = base ? String(base.numId).slice(0, -1) : '';
                                      const blueIcon = materialsData.find(m => String(m.numId) === baseNumId + '2');
                                      return <VisualIcon src={blueIcon?.image} name="blue" className="w-10 h-10 object-contain" />;
                                    })()}
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    max="40"
                                    value={formBlueCount}
                                    onChange={e => setFormBlueCount(parseInt(e.target.value) || 0)}
                                    className="w-full bg-cyan-500/5 hover:bg-cyan-500/10 focus:bg-cyan-500/15 border-[3px] border-cyan-500/10 focus:border-cyan-500/50 rounded-[2rem] p-6 pl-24 text-white font-black text-5xl outline-none transition-all font-mono shadow-[0_0_20px_rgba(6,182,212,0.1)] focus:shadow-[0_0_40px_rgba(6,182,212,0.3)] text-center"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div> {/* End of Top Grid (Select Target & Stats) */}

                    {/* --- BOTTOM SECTION: SQUAD ASSEMBLY & ROSTER --- */}
                    <div className="flex flex-col gap-8 w-full animate-in fade-in zoom-in-95 duration-500 mt-4">
                      {/* SQUAD ASSEMBLY SLOTS */}
                      <div className="flex flex-col gap-6 modal-section">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">{category === 'relics' ? '04' : '03'}</span>
                            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Squad Assembly <span className="text-slate-600 ml-2">({formChars.length}/4 REQUIRED)</span></h3>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {submitStatus.msg && (
                              <div className={`px-4 py-3 rounded-xl font-black text-xs border-2 ${submitStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                                {submitStatus.msg}
                              </div>
                            )}
                            {isBatchMode && (
                              <div className="px-4 py-3 rounded-xl font-black text-xs border-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-300 uppercase tracking-wider">
                                Session Added: {batchAddedCount}
                              </div>
                            )}
                            {submitting && (
                              <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest animate-pulse">
                                <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              {isBatchMode ? (
                                <>
                                  <button
                                    type="submit"
                                    onClick={() => { submitModeRef.current = 'continue'; }}
                                    disabled={submitting || formChars.length !== 4}
                                    className={`px-8 py-4 font-black rounded-2xl shadow-xl transition-all text-xs uppercase tracking-[0.15em] cursor-pointer disabled:opacity-20 active:translate-y-1 ${
                                      submitting
                                        ? 'bg-slate-800 text-slate-500'
                                        : 'bg-emerald-500 text-black hover:bg-emerald-400'
                                    }`}
                                  >
                                    Save Record
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    disabled={submitting}
                                    className="px-6 py-4 font-black rounded-2xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 shadow-xl transition-all text-xs uppercase tracking-[0.15em] cursor-pointer disabled:opacity-20 active:translate-y-1"
                                  >
                                    Done
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="submit"
                                  onClick={() => { submitModeRef.current = 'close'; }}
                                  disabled={submitting || formChars.length !== 4}
                                  className={`px-8 py-4 font-black rounded-2xl shadow-xl transition-all text-xs uppercase tracking-[0.15em] cursor-pointer disabled:opacity-20 active:translate-y-1 ${
                                    submitting
                                      ? 'bg-slate-800 text-slate-500'
                                      : 'bg-[#fcd34d] text-black hover:bg-white'
                                  }`}
                                >
                                  Push & Close
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-3">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Team Presets</h4>
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 mt-1">Save multiple squads and load instantly</p>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              {teamPresetPageCount > 1 && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveTeamPresetPage(-1)}
                                    disabled={teamPresetPage <= 0}
                                    className="w-8 h-8 rounded-lg border border-cyan-400/25 bg-cyan-500/10 text-cyan-200 hover:text-white hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-[0_0_8px_rgba(34,211,238,0.15)]"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200 bg-cyan-500/10 border border-cyan-400/25 rounded-lg px-2 py-1 min-w-[64px] text-center shadow-[0_0_10px_rgba(34,211,238,0.18)]">
                                    {teamPresetPage + 1}/{teamPresetPageCount}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => moveTeamPresetPage(1)}
                                    disabled={teamPresetPage >= teamPresetPageCount - 1}
                                    className="w-8 h-8 rounded-lg border border-cyan-400/25 bg-cyan-500/10 text-cyan-200 hover:text-white hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-[0_0_8px_rgba(34,211,238,0.15)]"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={teamPresetName}
                                  onChange={(e) => setTeamPresetName(e.target.value)}
                                  placeholder="Preset name"
                                  maxLength={24}
                                  className="w-36 sm:w-44 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white font-black outline-none focus:border-cyan-400/50"
                                />
                                <button
                                  type="button"
                                  onClick={saveTeamPreset}
                                  className="px-3 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/20 transition-all cursor-pointer"
                                >
                                  Save Team
                                </button>
                                <button
                                  type="button"
                                  onClick={resetCurrentTeam}
                                  className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-[10px] font-black uppercase tracking-wider hover:bg-red-500/20 transition-all cursor-pointer"
                                >
                                  Reset Team
                                </button>
                              </div>
                            </div>
                          </div>

                          {teamPresets.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {visibleTeamPresets.map((preset) => (
                                <div
                                  key={preset.id}
                                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-2 py-2"
                                >
                                  <button
                                    type="button"
                                    onClick={() => applyTeamPreset(preset)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.12em] max-w-[110px] truncate">
                                      {preset.name}
                                    </span>
                                    <div className="flex -space-x-1.5">
                                      {preset.chars.slice(0, 4).map((cid, idx) => {
                                        const c = getCharData(cid);
                                        return (
                                          <div
                                            key={`${preset.id}-${cid}-${idx}`}
                                            className={`w-6 h-6 rounded-full border overflow-hidden ${c.rarity === 5 ? 'border-orange-400' : 'border-purple-400'}`}
                                          >
                                            <VisualIcon src={c.image} name={c.name} className="w-full h-full object-cover" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteTeamPreset(preset.id)}
                                    className="w-7 h-7 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 flex items-center justify-center cursor-pointer transition-all"
                                    title="Delete preset"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                              No team presets yet. Build a 4-character team and save it.
                            </div>
                          )}

                          {recentTeams.length > 0 && (
                            <div className="flex flex-col gap-2 pt-1">
                              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Recent Teams</span>
                              <div className="flex flex-wrap gap-2">
                                {recentTeams.slice(0, 6).map((recent) => (
                                  <button
                                    key={`recent-team-${recent.id}`}
                                    type="button"
                                    onClick={() => applyRecentTeam(recent)}
                                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-2.5 py-1.5 hover:border-white/20 transition-all cursor-pointer"
                                  >
                                    <div className="flex -space-x-1.5">
                                      {recent.chars.slice(0, 4).map((cid, idx) => {
                                        const c = getCharData(cid);
                                        return (
                                          <div
                                            key={`${recent.id}-${cid}-${idx}`}
                                            className={`w-6 h-6 rounded-full border overflow-hidden ${c.rarity === 5 ? 'border-orange-400' : 'border-purple-400'}`}
                                          >
                                            <VisualIcon src={c.image} name={c.name} className="w-full h-full object-cover" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">
                                      {recent.category === 'traces' ? 'Trace' : 'Relic'}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={resetAllPresetData}
                              className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-[10px] font-black uppercase tracking-wider hover:bg-red-500/20 transition-all cursor-pointer"
                            >
                              Reset All Presets
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3 md:gap-4 w-full max-w-2xl">
                          {[0, 1, 2, 3].map(i => {
                            const char = formChars[i] ? getCharData(formChars[i]) : null;
                            const rarityBg = char ? (char.rarity === 5 ? 'bg-gradient-to-t from-orange-500/80 via-orange-500/20 to-transparent' : 'bg-gradient-to-t from-purple-500/80 via-purple-500/20 to-transparent') : '';
                            return (
                              <div
                                key={i}
                                onClick={() => formChars[i] && toggleChar(formChars[i])}
                                className={`slot-anim-${i} cavern-squad-slot aspect-[3/4] md:aspect-[4/5] rounded-[2rem] border-[3px] transition-all relative group flex items-center justify-center cursor-pointer ${isGlacial ? 'cavern-winter-slot-frame' : ''} ${formChars[i] ? (char.rarity === 5 ? 'border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.5)]' : 'border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.5)]') : 'border-white/10 border-dashed bg-black/30 hover:border-white/30 hover:bg-black/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'}`}
                              >
                                {char && (
                                  <div className="absolute left-1/2 -top-12 -translate-x-1/2 px-3 py-1.5 bg-slate-800 font-bold text-[10px] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] whitespace-nowrap shadow-2xl border border-white/20 scale-75 group-hover:scale-100 origin-bottom">
                                    {char.name}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                                  </div>
                                )}
                                {formChars[i] ? (
                                  <div className={`relative w-full h-full overflow-hidden rounded-[1.8rem] ${isGlacial ? 'glacial-subtle-snow cavern-winter-slot-inner' : ''}`}>
                                    <div className={`absolute inset-0 ${rarityBg}`}></div>
                                    <VisualIcon src={char.image} name={char.name} className="w-full h-full object-cover relative z-10 scale-105 group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-x-0 bottom-0 bg-red-600/90 py-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center backdrop-blur-sm z-20"><X className="w-6 h-6 text-white" /></div>
                                  </div>
                                ) : (
                                  <PlusCircle className="w-10 h-10 md:w-16 md:h-16 text-white/5 group-hover:text-white/30 transition-colors" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* FULL WIDTH ROSTER */}
                      <div className="bg-black/20 rounded-[2rem] p-5 border border-white/5 shadow-inner w-full">
                        {/* Search Input */}
                        <div className="relative mb-3">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Search character..."
                            value={charSearch}
                            onChange={e => setCharSearch(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all"
                          />
                          {charSearch && (
                            <button onClick={() => setCharSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 sm:gap-4 max-h-[300px] overflow-y-auto custom-scrollbar p-2 pt-12 pr-4">
                          {charactersData.filter(c => c.name.toLowerCase().includes(charSearch.toLowerCase())).map(c => {
                            const isAdded = formChars.includes(c.id);
                            const rarityBg = c.rarity === 5 ? 'bg-gradient-to-b from-orange-400/40 to-orange-600/80' : 'bg-gradient-to-b from-purple-400/40 to-purple-600/80';
                            const rarityBorder = c.rarity === 5 ? 'border-orange-500/50' : 'border-purple-500/50';
                            return (
                              <div
                                key={c.id}
                                onClick={(e) => {
                                  if (!isAdded) {
                                    const el = e.currentTarget;
                                    gsap.timeline({ onComplete: () => gsap.set(el, { clearProps: "all" }) })
                                      .to(el, { scale: 0.8, duration: 0.1, ease: "power2.in" })
                                      .to(el, { scale: 1.15, filter: 'brightness(1.5) contrast(1.2)', duration: 0.15, ease: "back.out(3)" })
                                      .to(el, { scale: 0.9, opacity: 0.3, filter: 'grayscale(1) brightness(0.5)', duration: 0.2 });
                                  }
                                  toggleChar(c.id, e);
                                }}
                                className={`relative aspect-square rounded-[1.25rem] sm:rounded-[1.5rem] cursor-pointer transition-all duration-300 border-[3px] roster-char-node flex items-center justify-center ${rarityBorder} ${isAdded ? 'scale-90 opacity-30 pointer-events-none grayscale' : 'hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] hover:border-white hover:z-10 bg-slate-900 active:scale-95 group'}`}
                              >
                                <div className="absolute left-1/2 -top-11 -translate-x-1/2 px-3 py-1.5 bg-blue-600 font-bold text-[10px] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] whitespace-nowrap shadow-[0_4px_20px_rgba(37,99,235,0.4)] scale-75 group-hover:scale-100 origin-bottom border border-blue-400/30">
                                  {c.name}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-blue-600"></div>
                                </div>
                                <div className="relative w-full h-full overflow-hidden rounded-[1.1rem]">
                                  <div className={`absolute inset-0 ${rarityBg} opacity-80 mix-blend-overlay`}></div>
                                  <VisualIcon src={c.image} name={c.name} className="w-full h-full object-cover relative z-10 scale-[1.20]" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Spacer since submit was moved up */}
                    <div className="pb-10"></div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Domain Grid */}
        <div className={`cavern-domain-grid grid items-start grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-4 ${themeConfig.caverns.gridOffsetClass || ''}`}>
          {loading ? (
            <div className="col-span-full flex justify-center py-20"><RefreshCw className="w-10 h-10 animate-spin text-slate-500" /></div>
          ) : filteredGridData.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center opacity-40">
              <Binary className="w-16 h-16 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">No Results matching those filters</p>
            </div>
          ) : (
            filteredGridData.map((item) => {
              const itemClears = clears.filter(c => c.relicId === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedDomain(item)}
                  className="domain-card cavern-domain-card flex min-h-[18rem] sm:min-h-[19rem] flex-col items-center self-start text-center gap-3 p-5 sm:p-6 bg-slate-900/60 backdrop-blur-sm border border-white/5 rounded-3xl hover:bg-slate-800/80 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all cursor-pointer group relative theme-glass-card"
                  style={{ '--card-radius': '1.5rem' }}
                >
                  <div className={`cavern-domain-tooltip absolute left-1/2 -top-10 -translate-x-1/2 px-3 py-1.5 font-bold text-[10px] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] whitespace-nowrap scale-75 group-hover:scale-100 origin-bottom ${
                    category === 'traces'
                      ? 'bg-emerald-600 border border-emerald-400/30 shadow-[0_4px_20px_rgba(16,185,129,0.4)]'
                      : 'bg-indigo-600 border border-indigo-400/30 shadow-[0_4px_20px_rgba(79,70,229,0.4)]'
                  }`}>
                    {item.name}
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent ${category === 'traces' ? 'border-t-emerald-600' : 'border-t-indigo-600'}`}></div>
                  </div>
                  {itemClears.length > 0 && (
                    <>
                      <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
                      <div className="absolute top-5 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[8px] font-black tracking-widest text-emerald-400 shadow-xl z-30">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="font-mono">{resetTimer}</span>
                      </div>
                    </>
                  )}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/40 rounded-2xl border border-white/5 shadow-inner p-2 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 relative flex items-center justify-center overflow-hidden">
                    <VisualIcon src={item.image} name={item.name} className="w-full h-full object-contain drop-shadow-lg" />
                  </div>
                  <h3 className={`text-white font-black text-xs sm:text-sm uppercase tracking-tight leading-snug line-clamp-2 px-2 mt-2 transition-colors ${category === 'traces' ? 'group-hover:text-emerald-300' : 'group-hover:text-indigo-300'}`}>
                    {item.name}
                  </h3>
                  <div className="mt-auto pt-2">
                    {itemClears.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-inner">
                        <CheckCircle2 className="w-3 h-3" /> {itemClears.reduce((sum, c) => sum + (c.verifiedCount || 1), 0)} Records
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-white/5 border border-white/5 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        Empty
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Archive Modal */}
        {selectedDomain && (
          <div className="theme-modal-overlay fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 pt-20 sm:pt-24 pb-6 sm:pb-10 transition-all overflow-y-auto">
            <div className={`theme-modal-shell archive-modal-shell w-full max-w-6xl max-h-[calc(100vh-7.5rem)] sm:max-h-[calc(100vh-9rem)] rounded-[3rem] flex flex-col overflow-hidden animate-in zoom-in-95 duration-400 relative ${isGlacial ? 'glacial-subtle-snow archive-modal-glacial' : ''}`}>
              <div className={`theme-modal-header archive-modal-header flex items-center justify-between p-6 sm:p-10 backdrop-blur-md ${isGlacial ? 'archive-modal-header-glacial' : ''}`}>
                <div className="flex items-center gap-5 sm:gap-8">
                  <div className={`theme-subpanel w-16 h-16 sm:w-24 sm:h-24 rounded-[1.5rem] flex items-center justify-center p-3 shadow-2xl relative ${isGlacial ? 'archive-modal-icon-glacial' : ''}`}>
                    <VisualIcon src={selectedDomain.image} name={selectedDomain.name} className="w-full h-full object-contain drop-shadow-2xl scale-110" />
                    <div className="absolute inset-0 bg-blue-500/5 rounded-[1.5rem] blur-xl animate-pulse"></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Navigation className={`w-4 h-4 ${isGlacial ? 'text-cyan-300' : 'text-indigo-400'}`} />
                      <span className={`text-[10px] uppercase font-black tracking-[0.4em] ${isGlacial ? 'text-cyan-300' : 'text-indigo-400'}`}>{category === 'relics' ? 'Archive Core' : 'Material Matrix'}</span>
                    </div>
                    <h2 className="text-2xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-none italic">{selectedDomain.name}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`theme-subpanel inline-flex items-center p-1 rounded-xl border shadow-inner ${isGlacial ? 'border-cyan-300/25' : ''}`}>
                    <button
                      onClick={() => {
                        setArchiveViewMode('grouped');
                        setArchiveFocusedTime(null);
                      }}
                      className={`px-3 py-2 sm:px-4 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        archiveViewMode === 'grouped'
                          ? (isGlacial
                            ? 'bg-cyan-400 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.4)]'
                            : 'bg-indigo-600 text-white shadow-[0_0_14px_rgba(99,102,241,0.35)]')
                          : (isGlacial
                            ? 'text-cyan-100/80 hover:text-cyan-50 hover:bg-cyan-300/15'
                            : 'text-slate-300 hover:text-white hover:bg-white/10')
                      }`}
                    >
                      By Time
                    </button>
                    <button
                      onClick={() => {
                        setArchiveViewMode('flat');
                        setArchiveFocusedTime(null);
                      }}
                      className={`px-3 py-2 sm:px-4 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        archiveViewMode === 'flat'
                          ? (isGlacial
                            ? 'bg-cyan-400 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.4)]'
                            : 'bg-indigo-600 text-white shadow-[0_0_14px_rgba(99,102,241,0.35)]')
                          : (isGlacial
                            ? 'text-cyan-100/80 hover:text-cyan-50 hover:bg-cyan-300/15'
                            : 'text-slate-300 hover:text-white hover:bg-white/10')
                      }`}
                    >
                      All Grid
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedDomain(null)}
                    className={`theme-icon-button w-14 h-14 rounded-full text-slate-400 flex items-center justify-center transition-all border cursor-pointer shadow-xl group ${isGlacial ? 'hover:bg-cyan-300 border-cyan-300/30 hover:text-slate-950' : 'hover:bg-[color:var(--theme-accent)] hover:text-[color:var(--theme-accent-contrast)]'}`}
                  >
                    <X className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>
              </div>

              <div className={`theme-subpanel flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar rounded-none border-0 ${isGlacial ? 'archive-modal-body-glacial' : ''}`}>
                {(() => {
                  const grouped = getGroupedTimesForDomain(selectedDomain.id);
                  const times = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
                  const totalVariantCards = times.reduce((sum, time) => sum + grouped[time].length, 0);

                  if (times.length === 0) {
                    return (
                      <div className="py-24 flex flex-col items-center text-center gap-6">
                        <Binary className="w-20 h-20 text-slate-800" />
                        <h3 className="text-3xl font-black text-slate-700 uppercase tracking-widest italic outline-text">Archive Blank</h3>
                        <button
                          onClick={() => { setSelectedDomain(null); setFormItemId(selectedDomain.id); setIsFormOpen(true); }}
                          className={`px-10 py-4 text-white font-black rounded-2xl uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer ${isGlacial ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                        >
                          + Log First Record
                        </button>
                      </div>
                    );
                  }

                  if (archiveViewMode === 'flat') {
                    const focusedCards = archiveFocusedTime ? (grouped[archiveFocusedTime] || []) : [];

                    if (archiveFocusedTime) {
                      return (
                        <div className="flex flex-col gap-6">
                          <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setArchiveFocusedTime(null)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                                  isGlacial
                                    ? 'bg-cyan-500/15 border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/25'
                                    : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                                }`}
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                Back
                              </button>
                              <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[14px] font-black font-mono tracking-tight ${isGlacial ? 'bg-cyan-500 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.35)]' : 'bg-indigo-600 text-white shadow-[0_0_18px_rgba(99,102,241,0.35)]'}`}>
                                {archiveFocusedTime}
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.24em]">
                              {focusedCards.length} Variants
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                            {focusedCards.map((card, cIdx) => (
                              <TeamCarouselCard
                                key={`${archiveFocusedTime}-${card.statsKey}-${cIdx}`}
                                card={card}
                                cardIndex={cIdx}
                                isGlacial={isGlacial}
                                getCharData={getCharData}
                                handleDelete={handleDelete}
                                adminPass={adminPass}
                                userKeys={userKeys}
                                VisualIcon={VisualIcon}
                                notify={notify}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-3">
                            <div className={`h-px w-16 ${isGlacial ? 'bg-gradient-to-r from-cyan-300/60 to-transparent' : 'bg-gradient-to-r from-indigo-500/50 to-transparent'}`}></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                              {totalVariantCards} Variant Cards
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                            {times.length} Time Nodes
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 px-2">
                          {times.map((time) => {
                            const timeCards = grouped[time];
                            const totalReports = timeCards.reduce(
                              (sum, card) => sum + card.variants.reduce((vSum, v) => vSum + (v.verifiedCount || 1), 0),
                              0
                            );
                            const currentPreviewIdx = Math.max(0, Math.min(timeCards.length - 1, timeNodePreviewIndex[time] ?? 0));
                            const previewCard = timeCards[currentPreviewIdx] || timeCards[0];
                            const previewTeam = previewCard?.variants?.[0] || null;
                            const previewCharIds = (previewTeam?.characters || previewTeam?.chars || []).filter(Boolean).slice(0, 4);
                            const previewMainStat = (previewTeam?.mainStat || previewCard?.mainStat || '').trim();
                            const previewSubstats = (previewCard?.substats || previewTeam?.substats || previewTeam?.reports?.[0]?.substats || [])
                              .filter(Boolean)
                              .slice(0, 4);
                            const previewNote = previewTeam?.reports?.find(r => r?.note)?.note || previewTeam?.note || '';
                            const previewLikes = Array.isArray(previewTeam?.likes) ? previewTeam.likes.length : 0;
                            const previewReporter = previewTeam?.reporters?.[0] || previewTeam?.reports?.[0]?.reporter || 'Anon';

                            return (
                              <div
                                key={`time-node-${time}`}
                                onClick={() => setArchiveFocusedTime(time)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setArchiveFocusedTime(time);
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                                className={`group rounded-[1.5rem] border p-4 text-left transition-all cursor-pointer ${
                                  isGlacial
                                    ? 'bg-cyan-950/25 border-cyan-300/20 hover:border-cyan-300/45 hover:bg-cyan-900/30'
                                    : 'bg-white/[0.02] border-white/10 hover:border-indigo-500/45 hover:bg-white/[0.045]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[14px] font-black font-mono tracking-tight ${isGlacial ? 'bg-cyan-500 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.35)]' : 'bg-indigo-600 text-white shadow-[0_0_18px_rgba(99,102,241,0.35)]'}`}>
                                    {time}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {timeCards.length > 1 && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            shiftTimeNodePreview(time, timeCards.length, -1);
                                          }}
                                          className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                                            isGlacial
                                              ? 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-400/20'
                                              : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                                          }`}
                                        >
                                          <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            shiftTimeNodePreview(time, timeCards.length, 1);
                                          }}
                                          className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                                            isGlacial
                                              ? 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-400/20'
                                              : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                                          }`}
                                        >
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                    <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isGlacial ? 'text-cyan-200' : 'text-slate-300'}`} />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                  {previewCharIds.length > 0 ? (
                                    previewCharIds.map((charId, idx) => {
                                      const ch = getCharData(charId);
                                      return (
                                        <div
                                          key={`${time}-${charId}-${idx}`}
                                          className={`w-8 h-8 rounded-full border-2 overflow-hidden ${
                                            ch.rarity === 5 ? 'border-orange-400' : 'border-purple-400'
                                          }`}
                                        >
                                          <VisualIcon src={ch.image} name={ch.name} className="w-full h-full object-cover" />
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">No Preview</span>
                                  )}
                                </div>

                                {previewCharIds.length > 0 && (
                                  <div className="mb-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                        First Team Reported
                                      </div>
                                      {timeCards.length > 1 && (
                                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                          Variant {currentPreviewIdx + 1}/{timeCards.length}
                                        </div>
                                      )}
                                    </div>
                                    {previewMainStat && (
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-[0.08em] ${
                                        isGlacial
                                          ? 'bg-cyan-950/35 border-cyan-300/25 text-cyan-100'
                                          : 'bg-black/30 border-white/10 text-indigo-200'
                                      }`}>
                                        {previewMainStat.split(': ').pop()}
                                      </span>
                                    )}
                                    <div className="flex flex-wrap gap-1.5">
                                      {previewSubstats.length > 0 ? (
                                        previewSubstats.map((s) => (
                                          <span
                                            key={`${time}-${s}`}
                                            className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.08em] ${
                                              isGlacial
                                                ? 'bg-cyan-950/45 border border-cyan-300/20 text-cyan-100'
                                                : 'bg-black/25 border border-white/10 text-amber-300'
                                            }`}
                                          >
                                            {String(s).replace(/_/g, ' ')}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">No Substats</span>
                                      )}
                                    </div>
                                    {previewNote && (
                                      <div className={`rounded-lg border px-2.5 py-2 text-[10px] font-semibold leading-snug line-clamp-2 ${
                                        isGlacial
                                          ? 'bg-cyan-950/30 border-cyan-300/20 text-cyan-100/90'
                                          : 'bg-black/25 border-white/10 text-slate-200'
                                      }`}>
                                        {previewNote}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div className={`rounded-xl border px-3 py-2 ${isGlacial ? 'bg-cyan-950/35 border-cyan-300/25' : 'bg-black/25 border-white/10'}`}>
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Reporter</div>
                                    <div className="text-sm font-black text-white truncate">@{previewReporter}</div>
                                  </div>
                                  <div className={`rounded-xl border px-3 py-2 ${isGlacial ? 'bg-cyan-950/35 border-cyan-300/25' : 'bg-black/25 border-white/10'}`}>
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Likes</div>
                                    <div className="text-sm font-black text-white">{previewLikes}</div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className={`rounded-xl border px-3 py-2 ${isGlacial ? 'bg-cyan-950/35 border-cyan-300/25' : 'bg-black/25 border-white/10'}`}>
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Variants</div>
                                    <div className="text-sm font-black text-white">{timeCards.length}</div>
                                  </div>
                                  <div className={`rounded-xl border px-3 py-2 ${isGlacial ? 'bg-cyan-950/35 border-cyan-300/25' : 'bg-black/25 border-white/10'}`}>
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Reports</div>
                                    <div className="text-sm font-black text-white">{totalReports}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-12">
                      {times.map((time, timeIdx) => (
                        <div key={time} className="flex flex-col gap-6">
                          <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-4">
                              <div className={`text-white px-6 py-2 rounded-2xl font-black text-3xl font-mono tracking-tighter ${isGlacial ? 'bg-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.35)]' : 'bg-indigo-600 shadow-[0_0_25px_rgba(79,70,229,0.3)]'}`}>
                                {time}
                              </div>
                              <div className={`h-px w-20 ${isGlacial ? 'bg-gradient-to-r from-cyan-300/60 to-transparent' : 'bg-gradient-to-r from-indigo-500/50 to-transparent'}`}></div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                {grouped[time].length} Variants
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                            {grouped[time].map((card, cIdx) => (
                              <TeamCarouselCard
                                key={cIdx}
                                card={card}
                                cardIndex={cIdx}
                                isGlacial={isGlacial}
                                getCharData={getCharData}
                                handleDelete={handleDelete}
                                adminPass={adminPass}
                                userKeys={userKeys}
                                VisualIcon={VisualIcon}
                                notify={notify}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{
          __html: `
        .perspective-1000 { perspective: 1000px; }
        @keyframes subtle-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        .animate-subtle-pulse { animation: subtle-pulse 3s infinite ease-in-out; }
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
        .outline-text { -webkit-text-stroke: 1px rgba(255,255,255,0.05); }
        .mask-fade-right { -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%); mask-image: linear-gradient(to right, black 85%, transparent 100%); }
        @keyframes progress-long {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
        .animate-progress-long { animation: progress-long 25s linear forwards; }
        .cavern-neon-999-wrap {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .cavern-neon-999-layer {
          position: absolute;
          top: 56%;
          width: min(28vw, 460px);
          max-width: 460px;
          height: auto;
          object-fit: contain;
          pointer-events: none;
          mix-blend-mode: screen;
          opacity: 0.2;
          filter: saturate(1.2) contrast(1.08) brightness(0.68) drop-shadow(0 0 18px rgba(0,243,255,0.2));
          transform-origin: center center;
        }
        .cavern-neon-999-layer-1 {
          left: 18%;
          transform: translate(-50%, -50%) skewX(-9deg) rotate(-5deg) scale(1.02);
          animation: neon-999-float-a 12s ease-in-out infinite;
        }
        .cavern-neon-999-layer-2 {
          left: 50%;
          transform: translate(-50%, -50%) skewX(-8deg) rotate(-1deg) scale(1.08);
          animation: neon-999-float-b 13.6s ease-in-out infinite;
        }
        .cavern-neon-999-layer-3 {
          left: 82%;
          transform: translate(-50%, -50%) skewX(-9deg) rotate(4deg) scale(1.02);
          animation: neon-999-float-c 11.4s ease-in-out infinite;
        }
        @keyframes neon-999-float-a {
          0%, 100% { transform: translate(-50%, -50%) skewX(-9deg) rotate(-5deg) scale(1.02); opacity: 0.18; }
          50% { transform: translate(-50%, -52%) skewX(-10deg) rotate(-6deg) scale(1.06); opacity: 0.24; }
        }
        @keyframes neon-999-float-b {
          0%, 100% { transform: translate(-50%, -50%) skewX(-8deg) rotate(-1deg) scale(1.08); opacity: 0.22; }
          50% { transform: translate(-50%, -53%) skewX(-9deg) rotate(-2deg) scale(1.13); opacity: 0.28; }
        }
        @keyframes neon-999-float-c {
          0%, 100% { transform: translate(-50%, -50%) skewX(-9deg) rotate(4deg) scale(1.02); opacity: 0.18; }
          50% { transform: translate(-50%, -52%) skewX(-10deg) rotate(5deg) scale(1.06); opacity: 0.24; }
        }
        @media (max-width: 900px) {
          .cavern-neon-999-layer {
            width: min(38vw, 320px);
            top: 58%;
            opacity: 0.16;
          }
        }
        .group:hover > .tooltip-fast { opacity: 1; transform: translate(-50%, 0) scale(1); }
        .cavern-domain-grid { position: relative; }
        .cavern-domain-card { position: relative; }
        .cavern-domain-card:hover { z-index: 120; }
        .cavern-domain-tooltip { z-index: 130; }
        .cavern-filter-chip:hover { z-index: 70; }
        .cavern-filter-tooltip { z-index: 80; }
        .arctic-theme .cavern-domain-card,
        .winter-theme .cavern-domain-card {
          overflow: visible !important;
        }
        .cavern-entry-modal.glacial-subtle-snow::after {
          border-top-left-radius: inherit;
          border-top-right-radius: inherit;
        }
        .arctic-theme .cavern-winter-shell,
        .winter-theme .cavern-winter-shell {
          background: linear-gradient(160deg, rgba(8, 20, 40, 0.72) 0%, rgba(8, 40, 70, 0.45) 45%, rgba(5, 15, 32, 0.78) 100%) !important;
          border-color: rgba(125, 211, 252, 0.28) !important;
          box-shadow: 0 18px 60px rgba(2, 8, 23, 0.68), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -24px 48px rgba(6, 182, 212, 0.08) !important;
        }
        .arctic-theme .cavern-winter-slot-frame,
        .winter-theme .cavern-winter-slot-frame {
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(8, 47, 73, 0.22) 100%);
          backdrop-filter: blur(2px);
        }
        .arctic-theme .cavern-winter-slot-inner,
        .winter-theme .cavern-winter-slot-inner {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -16px 32px rgba(8, 47, 73, 0.28);
        }
        .cavern-winter-slot-inner.glacial-subtle-snow::after {
          height: 16px;
          border-top-left-radius: 1.8rem;
          border-top-right-radius: 1.8rem;
        }
        .archive-modal-shell.glacial-subtle-snow::after {
          border-top-left-radius: inherit;
          border-top-right-radius: inherit;
        }
        .arctic-theme .archive-modal-glacial,
        .winter-theme .archive-modal-glacial {
          background: linear-gradient(160deg, rgba(3, 16, 36, 0.88) 0%, rgba(6, 36, 62, 0.74) 50%, rgba(4, 17, 32, 0.9) 100%) !important;
          border-color: rgba(125, 211, 252, 0.3) !important;
          box-shadow: 0 0 90px rgba(2, 8, 23, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -24px 48px rgba(56, 189, 248, 0.08) !important;
        }
        .arctic-theme .archive-modal-header-glacial,
        .winter-theme .archive-modal-header-glacial {
          background: linear-gradient(180deg, rgba(8, 27, 48, 0.78) 0%, rgba(8, 27, 48, 0.52) 100%) !important;
          border-bottom-color: rgba(125, 211, 252, 0.2) !important;
        }
        .arctic-theme .archive-modal-icon-glacial,
        .winter-theme .archive-modal-icon-glacial {
          background: linear-gradient(180deg, rgba(8, 23, 42, 0.88) 0%, rgba(6, 38, 64, 0.74) 100%);
          border-color: rgba(125, 211, 252, 0.28) !important;
        }
        .arctic-theme .archive-modal-body-glacial,
        .winter-theme .archive-modal-body-glacial {
          background: radial-gradient(circle at 80% 0%, rgba(56, 189, 248, 0.08), transparent 42%), rgba(2, 8, 23, 0.44) !important;
        }
        .archive-team-card.glacial-subtle-snow::after,
        .archive-team-stats.glacial-subtle-snow::after {
          border-top-left-radius: inherit;
          border-top-right-radius: inherit;
        }
        .arctic-theme .archive-team-card-glacial,
        .winter-theme .archive-team-card-glacial {
          background: linear-gradient(150deg, rgba(7, 22, 43, 0.84) 0%, rgba(10, 45, 72, 0.58) 56%, rgba(8, 21, 40, 0.84) 100%) !important;
          border-color: rgba(125, 211, 252, 0.24) !important;
          box-shadow: 0 16px 44px rgba(2, 8, 23, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
        }
        .arctic-theme .archive-team-card-glacial:hover,
        .winter-theme .archive-team-card-glacial:hover {
          border-color: rgba(125, 211, 252, 0.5) !important;
          box-shadow: 0 0 26px rgba(56, 189, 248, 0.22), 0 20px 48px rgba(2, 8, 23, 0.64) !important;
        }
        .arctic-theme .archive-team-stats-glacial,
        .winter-theme .archive-team-stats-glacial {
          background: linear-gradient(180deg, rgba(2, 16, 33, 0.74) 0%, rgba(5, 33, 56, 0.56) 100%) !important;
          border-color: rgba(125, 211, 252, 0.2) !important;
        }
        .arctic-theme .archive-team-note,
        .winter-theme .archive-team-note {
          border-color: rgba(125, 211, 252, 0.2) !important;
          background: rgba(7, 33, 56, 0.42) !important;
          color: rgba(186, 230, 253, 0.9) !important;
        }
        .arctic-theme .archive-team-source-pill,
        .winter-theme .archive-team-source-pill {
          border-color: rgba(45, 212, 191, 0.28) !important;
          background: rgba(3, 24, 30, 0.72) !important;
        }
        .arctic-theme .archive-team-reports-pill,
        .winter-theme .archive-team-reports-pill {
          border-color: rgba(125, 211, 252, 0.24) !important;
          background: rgba(6, 20, 36, 0.72) !important;
          color: #67e8f9 !important;
        }
        .arctic-theme .archive-team-like-btn,
        .winter-theme .archive-team-like-btn {
          border-color: rgba(125, 211, 252, 0.24) !important;
        }
      `}} />

        {/* Notifications */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto min-w-[300px] border-white/10 ${n.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                n.type === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-indigo-500/20 text-indigo-400'
                }`}
            >
              {n.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {n.type === 'error' && <Info className="w-5 h-5" />}
              {n.type === 'info' && <Trophy className="w-5 h-5 text-amber-400" />}
              <span className="font-black text-sm uppercase tracking-wider">{n.message}</span>
            </div>
          ))}
        </div>

      </div> {/* End Relative Z-10 Content Wrapper */}
    </div>
  );
}

// --- SUB-COMPONENT FOR TEAM CAROUSEL ---
const TeamCarouselCard = ({ card, cardIndex, isGlacial = false, getCharData, handleDelete, adminPass, userKeys, VisualIcon, notify }) => {
  const [idx, setIdx] = useState(0);
  const team = card.variants[idx];
  const totalTeams = card.variants.length;
  const [localLikes, setLocalLikes] = useState(team.likes || []);
  const [isLiking, setIsLiking] = useState(false);

  // Material Detection: Check if this card belongs to a material instead of a relic
  const isMaterial = materialsData.some(m => m.id === card.variants[0]?.relicId);
  const materialInfo = isMaterial ? materialsData.find(m => m.id === card.variants[0]?.relicId) : null;

  // Helper to find related tiers (Purple = 4*, Blue = 3*)
  const getMaterialTiers = () => {
    if (!materialInfo) return { purple: null, blue: null };
    const baseNumId = String(materialInfo.numId).slice(0, -1);
    const purple = materialsData.find(m => String(m.numId) === baseNumId + '3') || materialInfo;
    const blue = materialsData.find(m => String(m.numId) === baseNumId + '2');
    return { purple, blue };
  };

  const { purple, blue } = getMaterialTiers();

  // GSAP Animation for rewards reveal
  const rewardsRef = useRef(null);
  useEffect(() => {
    if (isMaterial && rewardsRef.current) {
      gsap.fromTo(rewardsRef.current.querySelectorAll('.mat-badge-anim'),
        { scale: 0.8, opacity: 0, y: 10, rotate: -2 },
        { scale: 1, opacity: 1, y: 0, rotate: 0, duration: 0.5, stagger: 0.15, ease: "back.out(1.7)" }
      );
    }
  }, [idx, team, isMaterial]);

  // Parse counts if it's a material
  const getMaterialCounts = (substats) => {
    const counts = { purple: 0, blue: 0 };
    if (!substats || !Array.isArray(substats)) return counts;
    substats.forEach(s => {
      if (s.startsWith('Purple:')) counts.purple = parseInt(s.split(':')[1]);
      if (s.startsWith('Blue:')) counts.blue = parseInt(s.split(':')[1]);
    });
    return counts;
  };

  const counts = isMaterial ? getMaterialCounts(team.substats) : null;

  // Simple persistent user identity for likes
  const getUserId = () => {
    let id = localStorage.getItem('hsr_user_id');
    if (!id) {
      id = "user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('hsr_user_id', id);
    }
    return id;
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (isLiking) return;
    setIsLiking(true);

    const userId = getUserId();
    const isCurrentlyLiked = localLikes.includes(userId);

    // Optimistic UI update
    setLocalLikes(prev => isCurrentlyLiked ? prev.filter(id => id !== userId) : [...prev, userId]);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'like',
          likeAction: isCurrentlyLiked ? 'remove' : 'add',
          userId,
          relicId: team.relicId,
          clearTime: team.clearTime,
          characters: team.characters,
          substats: team.substats || []
        })
      });
      const result = await res.json();
      if (result.success) {
        setLocalLikes(result.likes);
        team.likes = result.likes;
      } else {
        notify?.(result.error || 'Trust verification failed.', 'error');
        setLocalLikes(team.likes || []);
      }
    } catch (err) {
      console.error('Like failed:', err);
      notify?.('Network issue during trust verification.', 'error');
      setLocalLikes(team.likes || []);
    } finally {
      setIsLiking(false);
    }
  };

  // Sync likes when team variant changes
  useEffect(() => {
    setLocalLikes(team.likes || []);
  }, [team]);

  const nextTeam = (e) => {
    e.stopPropagation();
    setIdx((prev) => (prev + 1) % totalTeams);
  };
  const prevTeam = (e) => {
    e.stopPropagation();
    setIdx((prev) => (prev - 1 + totalTeams) % totalTeams);
  };

  const userId = typeof window !== 'undefined' ? localStorage.getItem('hsr_user_id') : null;
  const isHearted = localLikes.includes(userId);

  return (
    <div className={`archive-team-card flex flex-col gap-5 sm:gap-6 p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-slate-900/40 border border-white/5 hover:border-indigo-500/40 transition-all duration-500 group relative overflow-hidden shadow-2xl cursor-default w-full ${isGlacial ? 'glacial-subtle-snow archive-team-card-glacial' : ''}`}>
      {/* Background Decorative - Pushed in to avoid clipping */}
      <div className="absolute top-2 right-2 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
        <Gem className="w-20 h-20 sm:w-24 sm:h-24 text-white" />
      </div>

      {/* Team Section (Portraits + Indicator + Carousel Controls) */}
      <div className="grid grid-cols-[1fr_auto] gap-3 sm:gap-4 relative z-10 w-full items-start">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex -space-x-3 sm:-space-x-4 shrink-0 mt-2">
            {team.characters.map((cid, ci) => {
              const char = getCharData(cid);
              const rarityBorder = char.rarity === 5 ? 'border-orange-500' : 'border-purple-500';
              const rarityBg = char.rarity === 5 ? 'bg-gradient-to-t from-orange-500/20 to-transparent' : 'bg-gradient-to-t from-purple-500/20 to-transparent';

              return (
                <div
                  key={ci}
                  className={`w-11 h-11 sm:w-16 sm:h-16 rounded-full border-[2px] sm:border-[3px] ${rarityBorder} shadow-2xl relative transition-transform hover:scale-110 hover:z-50 bg-slate-900 group/char shrink-0`}
                  style={{ zIndex: ci }}
                >
                  <div className="absolute left-1/2 -top-10 -translate-x-1/2 px-2.5 py-1 bg-blue-600 font-bold text-[9px] text-white rounded-lg opacity-0 group-hover/char:opacity-100 transition-all duration-200 pointer-events-none z-[70] whitespace-nowrap shadow-[0_4px_20px_rgba(37,99,235,0.4)] scale-75 group-hover/char:scale-100 origin-bottom border border-blue-400/30">
                    {char.name}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-600"></div>
                  </div>
                  <div className="relative w-full h-full overflow-hidden rounded-full">
                    <div className={`absolute inset-0 ${rarityBg}`}></div>
                    <VisualIcon src={char.image} name={cid} className="w-full h-full object-cover relative z-10" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {(adminPass || team.reports?.some(r => userKeys[r.id])) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (adminPass) {
                  handleDelete({
                    relicId: team.relicId,
                    clearTime: team.clearTime,
                    characters: [...team.characters].sort().join(','),
                    substats: team.substats ? [...team.substats].sort().join(',') : undefined,
                    key: adminPass
                  });
                } else {
                  const myReport = team.reports.find(r => userKeys[r.id]);
                  if (myReport) handleDelete({ reportId: myReport.id, key: myReport.key });
                }
              }}
              className="p-1.5 sm:p-2 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white rounded-lg transition-all cursor-pointer opacity-40 hover:opacity-100"
              title="Delete Record"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-slate-500 font-black text-[9px] sm:text-[10px] shadow-inner tracking-tighter">
            #{cardIndex + 1}
          </div>

          <div className="flex flex-col items-end gap-1 sm:gap-2 mt-1">
            <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-800/80 border border-white/10 text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none shadow-lg backdrop-blur-sm whitespace-nowrap">
              Team {idx + 1}/{totalTeams}
            </div>
            {totalTeams > 1 && (
              <div className="flex gap-1 sm:gap-2">
                <button onClick={prevTeam} className="p-1 sm:px-2 rounded-md bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all cursor-pointer"><ChevronLeft className="w-3 h-3" /></button>
                <button onClick={nextTeam} className="p-1 sm:px-2 rounded-md bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all cursor-pointer"><ChevronRight className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Meta (Static for all teams in this card) */}
      <div className="flex flex-col gap-3 relative z-10 w-full">
        {team.reports?.find(r => r.note)?.note && (
          <div className="archive-team-note w-full bg-black/40 border border-indigo-500/10 rounded-xl p-4 flex gap-3 text-indigo-200/80 shadow-inner">
            <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-40 text-indigo-400" />
            <p className="text-xs font-black leading-tight break-words tracking-tight">{team.reports.find(r => r.note).note}</p>
          </div>
        )}
        <div className={`archive-team-stats bg-black/40 rounded-[2rem] p-5 sm:p-6 border border-white/5 shadow-inner min-h-[160px] flex flex-col justify-center gap-5 relative overflow-hidden group/stats ${isGlacial ? 'glacial-subtle-snow archive-team-stats-glacial' : ''}`} ref={rewardsRef}>
          {isMaterial ? (
            <div className="flex flex-col gap-5 relative z-10">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.2em] animate-pulse">Traces Drops</span>
              </div>
              <div className="flex gap-4 sm:gap-5 justify-center">
                {/* Purple Tier */}
                {purple && (
                  <div className="flex flex-col items-center gap-2 group/mat transition-all mat-badge-anim">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/60 rounded-[1.25rem] border-2 border-purple-500/40 p-2 relative shadow-2xl group-hover/mat:scale-110 group-hover/mat:rotate-3 transition-transform duration-500">
                      <VisualIcon src={purple.image} name={purple.name} className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                      <div className="absolute inset-0 bg-purple-400/10 rounded-xl blur-lg animate-pulse"></div>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-[-0.05em] drop-shadow-lg">{counts.purple}</span>
                  </div>
                )}
                {/* Blue Tier */}
                {blue && (
                  <div className="flex flex-col items-center gap-2 group/mat transition-all mat-badge-anim">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/60 rounded-[1.25rem] border-2 border-cyan-500/40 p-2 relative shadow-2xl group-hover/mat:scale-110 group-hover/mat:-rotate-3 transition-transform duration-500">
                      <VisualIcon src={blue.image} name={blue.name} className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                      <div className="absolute inset-0 bg-cyan-400/10 rounded-xl blur-lg animate-pulse"></div>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-[-0.05em] drop-shadow-lg">{counts.blue}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {(team.mainStat || card.mainStat) && (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap px-1">Main Stat</span>
                  <div className="flex">
                    <div className="px-3 py-1 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-purple-300/80 text-[10px] font-black uppercase tracking-widest rounded-lg">
                      {(team.mainStat || card.mainStat).split(': ').pop()}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Substats</span>
                <div className="flex flex-wrap gap-2">
                  {(team.substats || card.substats)?.map(s => (
                    <div key={s} className="px-2.5 py-1 bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/10 text-orange-400 text-[9px] font-black uppercase tracking-wider rounded-lg shadow-inner">
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Source Info (Specific to current team) */}
      <div className="flex flex-col gap-4 mt-2 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Source Node</span>
            <div className="archive-team-source-pill flex items-center gap-2 px-3 py-2 bg-black/50 rounded-xl border border-emerald-500/10 shadow-inner w-fit transition-all max-w-full" key={`src-${team.reporters?.[0]}`}>
              <Users className="w-3.5 h-3.5 text-emerald-500/60 shrink-0" />
              <span className="text-[11px] font-black text-white italic tracking-[0.02em] truncate min-w-0 pb-[1px] pr-1">@{team.reporters?.[0] || 'Anon'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Reports</span>
              <div className="archive-team-reports-pill flex items-center gap-1.5 px-3 py-2 bg-black/40 border border-white/5 text-emerald-400 rounded-xl font-black text-xs shadow-inner" title={`${team.verifiedCount || 1} Identical Submissions`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {team.verifiedCount || 1}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Trust Matrix</span>
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`archive-team-like-btn flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-black text-xs shadow-lg group/like ${isHearted
                  ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] ring-1 ring-indigo-400/50'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 border border-white/5'
                  } ${isLiking ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:scale-105 active:scale-90 cursor-pointer'}`}
                title={isHearted ? 'Unlike Team' : 'Legitimize Team'}
              >
                <Heart className={`w-3.5 h-3.5 transition-transform ${isHearted ? 'fill-current scale-110 animate-pulse' : 'group-hover/like:scale-110'}`} />
                <span>{localLikes.length || 0}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity ${isGlacial ? 'bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent' : 'bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent'}`}></div>
    </div>
  );
};
