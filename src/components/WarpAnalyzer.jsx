import React, { useState, useMemo, useEffect, useRef } from "react";
import gsap from 'gsap';
import { extractBannerId, fetchWarpStats, detectLuckyPeaks, calculateWarpMetrics, PRESET_BANNERS, FATE_CHARACTERS, fetchCentralizedBanners, fetchGenshinWishStats, GENSHIN_PRESET_BANNERS, estimateWinsOnlyDistribution, getCustomProxy, setCustomProxy, fetchWuWaStats, WUWA_PRESET_BANNERS, fetchZZZStats, ZZZ_PRESET_BANNERS, FATE_LIGHT_CONES } from "../utils/warpDataService";

// -- ICONS (Lucide Clones) --
const Icons = {
  Sparkles: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  Zap: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  BarChart3: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
  TrendingUp: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Target: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Star: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  ChevronRight: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>,
  ChevronLeft: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6"/></svg>,
  Gamepad: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>
};

export default function WarpAnalyzer({ sessionTheme }) {
  const isThemed = sessionTheme && sessionTheme !== 'modern';

  const [url, setUrl] = useState(() => localStorage.getItem('warp_source_url') || "");
  const [genshinBannerId, setGenshinBannerId] = useState(() => localStorage.getItem('genshin_banner_id') || "");
  const [selectedGame, setSelectedGame] = useState('hsr'); // 'hsr' | 'genshin'
  const [banners, setBanners] = useState(PRESET_BANNERS);
  const [selectedBannerId, setSelectedBannerId] = useState(PRESET_BANNERS[0]?.id); 
  const [bannerType, setBannerType] = useState('character');
  const [chartView, setChartView] = useState('count'); // 'count' | 'chance'
  const [winsOnlyMode, setWinsOnlyMode] = useState(false); // Toggle for wins-only distribution
  const [bannersLoading, setBannersLoading] = useState(false); // Loading state for banner fetching


  const [data, setData] = useState(null);
  const [cachedData, setCachedData] = useState({}); // Banner ID -> Data
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [modalTab, setModalTab] = useState('hsr'); // Tab for the config modal
  const [toast, setToast] = useState(null); // { message, type: 'cache' | 'fetch' }

  // Refs for sliding animations
  const gameTabsRef = useRef(null);
  const gamePillRef = useRef(null);
  const categoryTabsRef = useRef(null);
  const categoryPillRef = useRef(null);

  // -- THEME COLOR SELECTOR --
  const getGameColor = () => {
    const isGlacial = typeof document !== 'undefined' && (document.body.classList.contains('arctic-theme') || document.body.classList.contains('winter-theme'));
    if (isGlacial) return '#7dd3fc'; // Premium Ice Blue for all games in glacial theme

    if (selectedGame === 'hsr') return '#9333ea'; // purple-600
    if (selectedGame === 'genshin') return '#f59e0b'; // amber-500
    if (selectedGame === 'zzz') return '#22c55e'; // green-500
    if (selectedGame === 'wuwa') return '#06b6d4'; // cyan-500
    return '#9333ea';
  };

  const DEFAULT_URL = "https://starrailstation.com/en/warp#global";

  // -- Load banners based on selected game --
  useEffect(() => {
    const loadBanners = async () => {
      setBannersLoading(true);
      try {
        // Fetch banners from centralized API (works for HSR, Genshin, WuWa)
        if (selectedGame === 'hsr' || selectedGame === 'genshin' || selectedGame === 'wuwa') {
          const allBanners = await fetchCentralizedBanners(selectedGame);
          
          if (selectedGame === 'hsr') {
            const hsrBanners = allBanners.filter(b => b.game === 'hsr');
            if (hsrBanners.length > 0) {
              // Merge with Fate collaboration
              const mergedBanners = [...hsrBanners, ...FATE_CHARACTERS, ...FATE_LIGHT_CONES];
              setBanners(mergedBanners);
              setSelectedBannerId(mergedBanners[0].id);
            } else {
              const mergedBanners = [...PRESET_BANNERS, ...FATE_CHARACTERS, ...FATE_LIGHT_CONES];
              setBanners(mergedBanners);
              setSelectedBannerId(mergedBanners[0]?.id);
            }
          } else if (selectedGame === 'genshin') {
            const genshinBanners = allBanners.filter(b => b.game === 'genshin');
            if (genshinBanners.length > 0) {
              setBanners(genshinBanners);
              setSelectedBannerId(genshinBanners[0].id);
            } else {
              setBanners(GENSHIN_PRESET_BANNERS);
              setSelectedBannerId(GENSHIN_PRESET_BANNERS[0]?.id);
            }
          } else if (selectedGame === 'wuwa') {
            const wuwaBanners = allBanners.filter(b => b.game === 'wuwa');
            if (wuwaBanners.length > 0) {
              setBanners(wuwaBanners);
              setSelectedBannerId(wuwaBanners[0].id);
            } else {
              setBanners(WUWA_PRESET_BANNERS);
              setSelectedBannerId(WUWA_PRESET_BANNERS[0]?.id);
            }
          }
        } else if (selectedGame === 'zzz') {
          // ZZZ uses preset banners (zzz.rng.moe has clean API, no live discovery needed)
          setBanners(ZZZ_PRESET_BANNERS);
          setSelectedBannerId(ZZZ_PRESET_BANNERS[0]?.id);
        }
        // Clear current data when switching games
        setData(null);
        setBannerType('character');
        setWinsOnlyMode(false);
      } finally {
        setBannersLoading(false);
      }
    };
    loadBanners().catch(e => console.warn(e));
  }, [selectedGame]);

  const handleFetch = async (targetId, force = false) => {
    let fetchTarget = targetId || selectedBannerId; 
    
    if (!targetId && !url.trim()) {
        const potentialUrl = url.trim() || DEFAULT_URL;
        fetchTarget = (potentialUrl.includes('#global') || potentialUrl === DEFAULT_URL) ? 'global' : potentialUrl;
    }

    // For Genshin, we need to extract the actual API banner ID from the composite ID
    // Composite ID format: {bannerId}_{characterId} (e.g., "300093_xilonen")
    let apiBannerId = fetchTarget;
    if (selectedGame === 'genshin' && fetchTarget) {
      // Find the banner in our list to get its bannerId
      const banner = banners.find(b => b.id === fetchTarget);
      if (banner && banner.bannerId) {
        apiBannerId = banner.bannerId;
      } else if (fetchTarget.includes('_')) {
        // Fallback: extract from composite ID
        apiBannerId = fetchTarget.split('_')[0];
      }
    }

    const id = selectedGame === 'genshin' 
      ? apiBannerId 
      : (extractBannerId(fetchTarget) || (fetchTarget === 'global' ? 'global' : fetchTarget));

    if (!id) {
        setError("Invalid Source");
        return;
    }

    // Cache key includes game AND the unique banner ID (for character separation)
    const cacheKey = `${selectedGame}_${fetchTarget || id}`;

    // API GUARD: Don't refetch if we have data for this ID unless forced
    if (!force && cachedData[cacheKey]) {
        console.log(`[API GUARD] Using cached data for: ${cacheKey}`);
        setData(cachedData[cacheKey]);
        setToast({ message: '✓ Using cached data', type: 'cache' });
        setTimeout(() => setToast(null), 2000);
        return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setShowInputModal(false);
    setToast({ message: '↻ Fetching fresh data...', type: 'fetch' });

    try {
      let stats;
      if (selectedGame === 'zzz') {
        // ZZZ uses zzz.rng.moe API (clean JSON, same format as HSR)
        stats = await fetchZZZStats(id);
      } else if (selectedGame === 'wuwa') {
        // WuWa uses direct banner IDs - strip _character/_weapon suffix
        const cleanId = id.replace(/_(character|weapon)$/, '');
        stats = await fetchWuWaStats(cleanId);
      } else if (selectedGame === 'genshin') {
        stats = await fetchGenshinWishStats(id);
      } else {
        stats = await fetchWarpStats(id === 'global' ? '2099' : id);
      }
      setData(stats);
      setCachedData(prev => ({ ...prev, [cacheKey]: stats }));
      setToast({ message: '✓ Data updated!', type: 'cache' });
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setError(err.message);
      setToast(null);
    } finally {
      setLoading(false);
    }
  };


  // Banner filtering - handle HSR (light_cone), Genshin (weapon), WuWa (weapon), and ZZZ (standard, character, weapon, bangboo)
  const activeBanners = useMemo(() => {
    if (bannerType === 'character') {
      // For ZZZ, include 'standard' and 'bangboo' as character-like banners
      return banners.filter(b => b.type === 'character' || b.type === 'standard' || b.type === 'bangboo');
    }
    // For non-character, accept 'light_cone', 'weapon'
    return banners.filter(b => b.type === 'light_cone' || b.type === 'weapon');
  }, [banners, bannerType]);

  // Auto-select first banner when switching tabs to prevent stale selections
  useEffect(() => {
    if (activeBanners.length > 0) {
      const currentExists = activeBanners.some(b => b.id === selectedBannerId);
      if (!currentExists) {
        // Current selection doesn't exist in new tab, switch to first available
        setSelectedBannerId(activeBanners[0].id);
        setData(null); // Clear data for new selection
        setWinsOnlyMode(false);
      }
    }
  }, [activeBanners, selectedBannerId]);

  // GSAP Sliding Navbar Animations
  useEffect(() => {
    if (!gameTabsRef.current || !gamePillRef.current) return;
    
    const activeBtn = gameTabsRef.current.querySelector('button.active');
    if (activeBtn) {
      gsap.to(gamePillRef.current, {
        x: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        duration: 0.4,
        ease: "power2.out",
        backgroundColor: getGameColor()
      });
    }
  }, [selectedGame]);

  useEffect(() => {
    if (!categoryTabsRef.current || !categoryPillRef.current) return;
    
    const activeBtn = categoryTabsRef.current.querySelector('button.active');
    if (activeBtn) {
      gsap.to(categoryPillRef.current, {
        x: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        duration: 0.4,
        ease: "power2.out"
      });
    }
  }, [bannerType]);

  // Current selected banner
  const currentBanner = useMemo(() => {
    return banners.find(b => b.id === selectedBannerId) || activeBanners[0] || PRESET_BANNERS[0];
  }, [banners, selectedBannerId, activeBanners]);

  // Calculate 50/50 win rate from API data
  const winRate = useMemo(() => {
    if (!data || !data.stats) return null;
    const wins = data.stats.count_win_5 || 0;
    const losses = data.stats.count_lose_5 || 0;
    const total = wins + losses;
    if (total === 0) return null;
    return Math.round((wins / total) * 100);
  }, [data]);

  // Calculate wins-only distribution for both HSR and Genshin
  const winsOnlyData = useMemo(() => {
    if (!data || !data.stats) return null;
    return estimateWinsOnlyDistribution(data.stats, currentBanner?.characterId);
  }, [data, currentBanner]);

  // Normal analysis (all pulls)
  const analysis = useMemo(() => {
    if (!data || !data.stats) return null;
    const pulls5 = data.stats.by_rollnum_pulls_5 || {};
    const chance5 = data.stats.by_rollnum_chance_5 || {};
    
    console.log('\n=== WEBSITE WARP ANALYZER DEBUG ===');
    console.log('Selected Banner ID:', selectedBannerId);
    console.log('Total 5* Wins:', data.stats.count_win_5);
    console.log('Total 5* Losses:', data.stats.count_lose_5);
    
    const peaks = detectLuckyPeaks(pulls5, chance5, { topN: 3, minZScore: 0.5 });
    console.log('All Detected Peaks:', peaks.map(p => `Roll ${p.roll} (${(p.chance * 100).toFixed(2)}%)`));
    
    const metrics = calculateWarpMetrics(data.stats);
    console.log('===================================\n');
    
    return { peaks, metrics };
  }, [data, selectedBannerId]);

  // Wins-only analysis (Elite filter for "purer" results)
  const winsOnlyAnalysis = useMemo(() => {
    if (!winsOnlyData) return null;
    const peaks = detectLuckyPeaks(winsOnlyData.winsOnlyPulls5, winsOnlyData.winsOnlyChance5, { 
      topN: 2,      // 2 peaks per segment (better balance)
      minZScore: 0.75 // Moderate lucky threshold
    });
    return { peaks, winRatioPct: winsOnlyData.winRatioPct };
  }, [winsOnlyData]);

  // Active analysis based on mode (Wins only is restricted to Genshin)
  const isWinsOnlyActive = winsOnlyMode && selectedGame === 'genshin';
  const activeAnalysis = isWinsOnlyActive ? winsOnlyAnalysis : analysis;

  const chartData = useMemo(() => {
    if (!data || !data.stats) return [];
    
    // Use wins-only data when toggled AND for Genshin only
    const useWinsOnly = winsOnlyMode && selectedGame === 'genshin' && winsOnlyData;
    
    const pulls5 = useWinsOnly
      ? winsOnlyData.winsOnlyPulls5 
      : data.stats.by_rollnum_pulls_5 || {};
    const chance5 = useWinsOnly
      ? winsOnlyData.winsOnlyChance5 
      : data.stats.by_rollnum_chance_5 || {};
      
    return Array.from({ length: 90 }, (_, i) => ({
      roll: i + 1,
      count: pulls5[i + 1] || 0,
      chance: chance5[i + 1] || 0
    }));
  }, [data, winsOnlyMode, winsOnlyData, selectedGame]);

  const maxCount = useMemo(() => Math.max(...chartData.map(d => d.count), 1), [chartData]);
  const maxChance = useMemo(() => Math.max(...chartData.map(d => d.chance), 0.001), [chartData]);

  const pullStrategy = useMemo(() => {
    const peaks = activeAnalysis?.peaks || [];
    if (!peaks.length) return [];
    
    const sortedPeaks = [...peaks].sort((a, b) => a.roll - b.roll);
    const strategy = [];
    let currentRoll = 0;
    
    for (const peak of sortedPeaks) {
      const targetRoll = peak.roll;
      
      // SWEEP PATH LOGIC: Singles first to align digit, then x10 to land.
      const targetDigit = targetRoll % 10;
      const currentDigit = currentRoll % 10;
      const singlesNeeded = (targetDigit - currentDigit + 10) % 10;
      
      // 1. Initial Singles to reach alignment
      if (singlesNeeded > 0) {
        const nextRoll = currentRoll + singlesNeeded;
        strategy.push({
          type: 'x1',
          from: currentRoll,
          to: nextRoll,
          count: singlesNeeded,
          chance: (peak.chance * 100).toFixed(2)
        });
        currentRoll = nextRoll;
      }
      
      // 2. Multis to reach target decade
      const distanceLeft = targetRoll - currentRoll;
      if (distanceLeft > 0) {
        const x10Count = Math.floor(distanceLeft / 10);
        if (x10Count > 0) {
          const nextRoll = currentRoll + (x10Count * 10);
          strategy.push({
            type: 'x10',
            from: currentRoll,
            to: nextRoll,
            count: x10Count,
            chance: (peak.chance * 100).toFixed(2)
          });
          currentRoll = nextRoll;
        }
      }
      
      // 3. Final Landing check (should be 0 if math is right)
      if (currentRoll < targetRoll) {
        strategy.push({
          type: 'x1',
          from: currentRoll,
          to: targetRoll,
          count: targetRoll - currentRoll,
          chance: (peak.chance * 100).toFixed(2)
        });
        currentRoll = targetRoll;
      }
    }
    return strategy;
  }, [activeAnalysis]);

    // Soft pity varies by game and banner type
    // HSR: Characters 75-90, Light Cones 65-80
    // Genshin: Characters 74-90, Weapons 63-80
    // WuWa: Characters 70-80, Weapons 63-80
    const softPityStart = selectedGame === 'wuwa'
      ? (bannerType === 'character' ? 70 : 63)
      : selectedGame === 'genshin' 
        ? (bannerType === 'character' ? 74 : 63)
        : (bannerType === 'character' ? 75 : 65);
    const softPityEnd = selectedGame === 'wuwa'
      ? 80
      : selectedGame === 'genshin'
        ? (bannerType === 'character' ? 90 : 80)
        : (bannerType === 'character' ? 90 : 80);

    const shortcutString = useMemo(() => {
    const peaks = activeAnalysis?.peaks || [];
    if (!peaks.length) return { string: "---", pity: [], path: [] };
    
    // Include ALL peaks up to hard pity (90) to match Discord bot behavior
    // This ensures pity rolls are shown in the lucky string
    // Include ALL peaks up to hard pity (90) to match Discord bot behavior
    // This ensures pity rolls are shown in the lucky string
    const hardPity = selectedGame === 'wuwa'
      ? 80
      : 90; // Unified hard pity cap (allows 81-90 for LC outliers)
    
    const allPeaks = peaks.filter(p => p.roll <= hardPity).sort((a, b) => a.roll - b.roll);
    if (allPeaks.length === 0) return { string: "---", pity: [], path: [] };
    
    // SWEEP-ALIGNED ALGORITHM:
    // For each peak, calculate how many x1 singles to do so that the x10 ENDS on the peak
    // Formula: peak.roll % 10 = singles to do, then x10s will land on multiples of 10 offset by that amount
    const digits = [];
    const pityNumbers = [];
    const path = [];
    
    let currentPosition = 0; // Track cumulative position
    
    for (const peak of allPeaks) {
      // The "Shortcut Digit" is the final digit of the pity
      const targetDigit = peak.roll % 10;
      digits.push(targetDigit.toString());
      pityNumbers.push(peak.roll);
      
      // RELATIVE SWEEP CALCULATION:
      // How many singles to do NOW to align with the target's digit
      const currentDigit = currentPosition % 10;
      const singlesNeeded = (targetDigit - currentDigit + 10) % 10;
      const totalDistance = peak.roll - currentPosition;
      
      // Multis needed after the singles adjustment
      const x10Count = Math.floor((totalDistance - singlesNeeded) / 10);
      
      path.push({
        singles: singlesNeeded,
        x10s: x10Count,
        landsOn: peak.roll,
        chance: peak.chance
      });
      
      // Update current position for next iteration
      currentPosition = peak.roll;
    }
    
    const isGlacial = typeof document !== 'undefined' && (document.body.classList.contains('arctic-theme') || document.body.classList.contains('winter-theme'));
    
    return {
      string: digits.join(" "),
      pity: pityNumbers,
      path: path,
      isGlacial
    };
  }, [activeAnalysis, selectedGame, bannerType]);

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-amber-500 selection:text-white pb-20 relative overflow-hidden">
        {/* TOAST NOTIFICATION */}
        {toast && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md border text-sm font-bold uppercase tracking-wider transition-all duration-300 animate-in fade-in slide-in-from-top-4
                ${toast.type === 'cache' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-purple-500/20 border-purple-500/50 text-purple-400'}
            `}>
                {toast.message}
            </div>
        )}

        {/* GLOBAL BACKGROUND ELEMENTS - Only show when not themed or specific to modern */}
        {(!isThemed) && (
          <div className="fixed inset-0 pointer-events-none z-0">

            {/* DOT PATTERN */}
            <div className="absolute inset-0 opacity-[0.15]" 
                 style={{ backgroundImage: 'radial-gradient(#f59e0b 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
            
            {/* FADED CHARACTER BG */}
            {currentBanner?.image && (
                <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out overflow-hidden">
                    <img 
                        src={currentBanner.image} 
                        alt="" 
                        className="absolute top-0 right-0 h-full w-auto object-cover opacity-25 grayscale-[0.2] brightness-[0.7] blur-[12px] scale-110 origin-right" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-slate-950/20 via-slate-950/60 to-slate-950" />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/10 via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
                </div>
            )}
          </div>
        )}


        <div className="relative container mx-auto px-4 py-8 md:py-12 max-w-7xl z-10">
           <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
               
               {/* SIDEBAR TITLE COLUMN - STICKY */}
               <div className="hidden md:flex flex-col items-center justify-center sticky top-20 self-start py-12 border-r border-slate-800/50 pr-8 lg:pr-12">
                   <h1 className="rotate-180 whitespace-nowrap text-5xl lg:text-7xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-t from-purple-500 via-amber-400 to-yellow-500 drop-shadow-[0_0_20px_rgba(251,191,36,0.15)]" style={{ writingMode: 'vertical-rl' }}>
                       WARP ANALYZER
                   </h1>
               </div>

               {/* MAIN CONTENT COLUMN */}
               <div className="flex-1">
                   {/* MOBILE TITLE */}
                   <div className="md:hidden text-center mb-12">
                        <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-amber-400 to-yellow-500 drop-shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                            WARP ANALYZER
                        </h1>
                   </div>

                   {/* HEADER INFO */}
                   <div className="text-center md:text-left mb-12 flex flex-col md:items-start items-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 backdrop-blur-sm border border-slate-800 mb-6 cursor-pointer hover:border-amber-500/30 transition-colors" onClick={() => setShowInputModal(true)}>
                         <Icons.Sparkles className="w-4 h-4 text-amber-500" />
                         <span className="text-sm text-slate-400 font-medium tracking-widest uppercase">Svarog Optimized</span>
                      </div>
                      <p className="text-xs text-slate-500 uppercase tracking-[0.3em] font-bold opacity-60">Decode the Gacha • Find Your Fate</p>
                   </div>

                  {/* DISCLAIMER / HOW TO USE */}
                  <div className="max-w-4xl mx-auto mb-8 bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-400">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                        <Icons.Target className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="space-y-2">
                        <p>
                          <span className="text-amber-400 font-bold uppercase tracking-wider mr-1">Disclaimer:</span> 
                          This analyzer adapts to live chart data which varies over time. Signal strength from Day 1 can differ from Day 2 or the end of the patch as the total sample size grows.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            Best used at patch start (High contributor volume)
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            Optimal timing: Late Day 1 or Day 2
                          </div>
                        </div>
                        <p className="border-t border-slate-800 pt-2 italic text-[10px]">
                          * This is not a magic prediction tool. It is a statistical analyzer of real pull data, highlighting rolls with the highest historical probability to trigger a 5★ drop.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* GAME SWITCHER */}
                  <div className="max-w-4xl mx-auto mb-8">
                    <div className="flex justify-center">
                      <div ref={gameTabsRef} className="relative inline-flex items-center gap-2 p-1 bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
                        <div ref={gamePillRef} className="absolute top-1 bottom-1 left-0 rounded-lg shadow-lg z-0 pointer-events-none" style={{ backgroundColor: getGameColor() }} />
                        <button
                          onClick={() => setSelectedGame('hsr')}
                          disabled={bannersLoading}
                          className={`game-btn z-10 relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors duration-300 ${
                            bannersLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            selectedGame === 'hsr' ? 'active text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <img src={`${import.meta.env.BASE_URL}HSRIcon.png`} alt="HSR" className="w-6 h-6 rounded-full" />
                          Honkai: Star Rail
                        </button>
                        <button
                          onClick={() => setSelectedGame('genshin')}
                          disabled={bannersLoading}
                          className={`game-btn z-10 relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors duration-300 ${
                            bannersLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            selectedGame === 'genshin' ? 'active text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <img src={`${import.meta.env.BASE_URL}genshinIcon.png`} alt="Genshin" className="w-6 h-6 rounded-full" />
                          Genshin Impact
                        </button>
                        {/* TEMPORARILY DISABLED: ZZZ button until zzz.rng.moe banner IDs are confirmed */}
                        {/* <button
                          onClick={() => setSelectedGame('zzz')}
                          className={`game-btn z-10 relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${
                            selectedGame === 'zzz' ? 'active text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <img src={`${import.meta.env.BASE_URL}zzzIcon.png`} alt="ZZZ" className="w-6 h-6 rounded-full" />
                          Zenless Zone Zero
                        </button> */}
                        <button
                          onClick={() => setSelectedGame('wuwa')}
                          disabled={bannersLoading}
                          className={`game-btn z-10 relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors duration-300 ${
                            bannersLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            selectedGame === 'wuwa' ? 'active text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <img src={`${import.meta.env.BASE_URL}wuwaIcon.png`} alt="WuWa" className="w-6 h-6 rounded-full" />
                          Wuthering Waves
                        </button>
                      </div>
                    </div>
                    {/* LOADING PROGRESS BAR */}
                    {bannersLoading && (
                      <div className="mt-4 flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="w-full max-w-md h-1 bg-slate-800 rounded-full overflow-hidden relative">
                          <div 
                            className="absolute inset-y-0 left-0 w-1/3 rounded-full animate-progress-scan"
                            style={{ backgroundColor: getGameColor(), boxShadow: `0 0 10px ${getGameColor()}` }}
                          />
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em] animate-pulse">
                          Loading {selectedGame === 'hsr' ? 'Honkai: Star Rail' : selectedGame === 'genshin' ? 'Genshin Impact' : 'Wuthering Waves'} banners...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* BANNER SELECTION (Tabs + Grid) */}
                  <div className="max-w-4xl mx-auto mb-12">
                     <div className="flex justify-center mb-8">
                         <div ref={categoryTabsRef} className="relative grid grid-cols-2 p-1 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg w-full max-w-md overflow-hidden">
                               <div ref={categoryPillRef} className="absolute top-1 bottom-1 left-0 rounded-md shadow-lg z-0 bg-purple-600 pointer-events-none" />
                              <button
                                  onClick={() => setBannerType('character')}
                                  className={`z-10 relative py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer ${bannerType === 'character' ? "active text-white" : "text-slate-400 hover:text-white"}`}
                              >
                                  Characters
                              </button>
                              <button
                                  onClick={() => setBannerType(selectedGame === 'hsr' ? 'light_cone' : 'weapon')}
                                  className={`z-10 relative py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer ${(bannerType === 'light_cone' || bannerType === 'weapon') ? "active text-white" : "text-slate-400 hover:text-white"}`}
                              >
                                  {selectedGame === 'hsr' ? 'Light Cones' : 'Weapons'}
                              </button>
                         </div>

                     </div>

                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {activeBanners.map((banner, index, array) => {
                             const isSelected = selectedBannerId === banner.id;
                             const prevBanner = index > 0 ? array[index - 1] : null;
                             const showSeparator = banner.separator && (!prevBanner || !prevBanner.collaboration);
                             
                             return (
                                 <React.Fragment key={`${banner.id}_${banner.characterId}`}>
                                     {/* Separator for collaboration banners */}
                                     {showSeparator && (
                                         <div className="col-span-2 md:col-span-4 flex items-center gap-4 my-4">
                                             <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
                                             <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
                                                 <Icons.Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                 <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                                                     {banner.collaboration} Collaboration
                                                 </span>
                                                 <Icons.Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                             </div>
                                             <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 via-transparent to-transparent"></div>
                                         </div>
                                     )}
                                     
                                     <div 
                                         onClick={() => { setSelectedBannerId(banner.id); handleFetch(banner.id); }}
                                         className={`
                                              group cursor-pointer relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-300 theme-glass-card warp-banner-card
                                              ${isSelected ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.02]" : "border-slate-800 hover:border-amber-500/50 hover:scale-[1.01]"}
                                              bg-slate-900/50 backdrop-blur-sm
                                          `}
                                     >
                                          <img 
                                              src={banner.image} 
                                              alt={banner.name} 
                                              className={`w-full h-full object-cover transition-all duration-700 ${isSelected ? "grayscale-0 scale-110" : "grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"}`} 
                                          />
                                         <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                                         <div className="absolute bottom-0 left-0 right-0 p-4">
                                              <div className="flex gap-1 mb-2">
                                                 {[...Array(5)].map((_, i) => (
                                                      <Icons.Star key={i} className={`w-3 h-3 ${isSelected ? "text-amber-500 fill-amber-500" : "text-slate-600 fill-slate-600"}`} />
                                                 ))}
                                              </div>
                                             <h3 className={`text-sm font-bold uppercase tracking-wider ${isSelected ? "text-white" : "text-slate-400"}`}>{banner.name}</h3>
                                             {banner.collaboration && (
                                                 <div className="mt-1 text-[10px] text-amber-400/70 font-medium uppercase tracking-wider">
                                                     {banner.collaboration}
                                                 </div>
                                             )}
                                         </div>
                                          {isSelected && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" />}
                                     </div>
                                 </React.Fragment>
                             )
                         })}
                     </div>
                  </div>

                  {/* ERROR DISPLAY WITH RECOVERY OPTIONS */}
                  {error && !loading && (
                    <div className={`max-w-4xl mx-auto mb-8 ${error.includes('400') ? 'bg-amber-950/40 border-amber-500/30' : 'bg-red-950/40 border-red-500/30'} border rounded-2xl p-6 animate-in fade-in`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-2 ${error.includes('400') ? 'bg-amber-500/20' : 'bg-red-500/20'} rounded-lg shrink-0`}>
                          <Icons.Zap className={`w-5 h-5 ${error.includes('400') ? 'text-amber-400' : 'text-red-400'}`} />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h4 className={`${error.includes('400') ? 'text-amber-400' : 'text-red-400'} font-bold uppercase tracking-wider text-sm`}>
                              {error.includes('400') ? 'No Data Available Yet' : 'Fetch Failed'}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">
                              {error.includes('400') 
                                ? 'Community data for this banner has not been collected yet. This usually happens with brand new banners.' 
                                : error}
                            </p>
                          </div>
                          {/* Only show retry buttons for non-400 errors to avoid API flooding */}
                          {!error.includes('400') && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleFetch(selectedBannerId, true)}
                                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 rounded-lg text-xs font-bold text-red-400 uppercase tracking-wider transition-all"
                              >
                                ↻ Retry Now
                              </button>
                              <button
                                onClick={() => setShowInputModal(true)}
                                className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/40 rounded-lg text-xs font-bold text-slate-300 uppercase tracking-wider transition-all"
                              >
                                ⚙ Manual Override
                              </button>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-500 italic">
                            {error.includes('400') 
                              ? 'Tip: Try a different banner, or check back in a few hours once the community uploads more pull data.' 
                              : 'Tip: Click "Manual Override" to enter a banner ID directly, or wait for automatic retry on next banner selection.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LOADING STATE */}
                  {loading && (
                    <div className="max-w-4xl mx-auto mb-8 bg-purple-950/30 border border-purple-500/30 rounded-2xl p-6 animate-pulse">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-purple-400 font-bold uppercase tracking-wider text-sm">Fetching data (retrying if needed)...</span>
                      </div>
                    </div>
                  )}

                  {/* INITIATE BUTTON REMOVED - Clicking banners auto-triggers fetch with caching */}
                  {/* Force refresh available in config modal */}

                  {/* ANALYTICS GRID */}
                  {data && analysis && (
                     <div className="grid lg:grid-cols-3 gap-6 items-start animate-in fade-in slide-in-from-bottom-8 duration-700">
                         <div className="lg:col-span-2 space-y-6">
                             {/* DISTRIBUTION CHART */}
                             <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
                                 <div className="flex items-center justify-between mb-6">
                                       <div className="flex items-center gap-2">
                                          <Icons.BarChart3 className="w-5 h-5 text-purple-500" />
                                          <h3 className="text-xl font-bold text-white">Distribution</h3>
                                          {/* 50/50 Win Rate Badge */}
                                          {winRate && (
                                            <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                              50/50: {winRate}%
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                           {/* Count/Chance Toggle */}
                                           <div className="flex bg-slate-800/50 rounded-lg p-1">
                                              <button onClick={() => setChartView('count')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${chartView === 'count' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-white"}`}>Count</button>
                                              <button onClick={() => setChartView('chance')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${chartView === 'chance' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-white"}`}>Chance %</button>
                                           </div>
                                        </div>
                                  </div>
                                 
                                  <div className="relative h-[400px] w-full pt-8">
                                      <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-[10px] text-slate-600 font-mono">
                                          {[100, 75, 50, 25, 0].map(v => <span key={v}>{v}</span>)}
                                      </div>
                                      <div className="ml-8 h-full flex items-end gap-[3px] pb-6">
                                          {chartData.map((d, i) => {
                                             const val = chartView === 'count' ? d.count : d.chance;
                                             const max = chartView === 'count' ? maxCount : maxChance;
                                             const height = Math.max((val / max) * 100, 2);
                                             const peakInfo = activeAnalysis?.peaks?.find(p => p.roll === d.roll);
                                             const isPeak = !!peakInfo;
                                             // Soft pity: Characters 75-90, Light Cones 65-80
                                             const softPityStart = bannerType === 'light_cone' ? 65 : 75;
                                             const softPityEnd = bannerType === 'light_cone' ? 80 : 90;
                                             const highlighting = d.roll >= softPityStart && d.roll <= softPityEnd;
                                             const zScore = peakInfo ? peakInfo.zScore : null;
                                             
                                             return (
                                                  <div 
                                                      key={i}
                                                      className={`flex-1 rounded-t-sm transition-all duration-300 hover:opacity-80 hover:z-50 group relative cursor-pointer
                                                       ${isPeak ? "bg-amber-400 shadow-[0_0_8px_#fbbf24] z-10" : highlighting ? "bg-purple-600" : "bg-slate-700"}
                                                   `}
                                                   style={{ height: `${height}%` }}
                                               >
                                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 border border-slate-700 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-[300] pointer-events-none shadow-xl">
                                                       <div className="font-bold">Roll #{d.roll}</div>
                                                       <div className="text-slate-400">Count: {d.count.toLocaleString()}</div>
                                                       <div className="text-purple-400">Chance: {(d.chance * 100).toFixed(2)}%</div>
                                                       {zScore && <div className="text-amber-400 font-mono">Z: {zScore}</div>}
                                                   </div>
                                                  </div>
                                             )
                                         })}
                                     </div>
                                           <span>1</span>
                                           <span>Soft Pity ({softPityStart})</span>
                                           <span>{softPityEnd}</span>
                                  </div>

                                  <div className="mt-6 pt-6 border-t border-slate-800/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-slate-800/30 rounded-lg p-3">
                                          <div className="flex items-center gap-2 mb-2">
                                              <Icons.Target className="w-4 h-4 text-amber-400" />
                                              <span className="text-xs font-bold text-white uppercase tracking-wider">How to Use Shortcut</span>
                                          </div>
                                           <div className="text-[11px] text-slate-400 space-y-1">
                                               <p><span className="text-amber-400 font-bold">1.</span> Each digit = <span className="text-white font-bold">single pulls</span></p>
                                               <p><span className="text-amber-400 font-bold">2.</span> After digit, do <span className="text-purple-400 font-bold">x10 pull</span></p>
                                               <p><span className="text-amber-400 font-bold">3.</span> Repeat until 5★</p>
                                               <p className="text-slate-500 pt-1 text-[10px]"><span className="text-amber-400 font-bold">0</span>=skip singles | Ex: <span className="text-amber-400">6</span>→<span className="text-purple-400">x10</span>→<span className="text-amber-400">7</span>...</p>
                                           </div>
                                      </div>
                                      <div className="bg-slate-800/30 rounded-lg p-3">
                                          <div className="flex items-center gap-2 mb-2">
                                              <Icons.TrendingUp className="w-4 h-4 text-amber-400" />
                                              <span className="text-xs font-bold text-white uppercase tracking-wider">What is Z-Score?</span>
                                          </div>
                                           <div className="text-[11px] text-slate-400 space-y-1">
                                               <p>How <span className="text-white font-bold">statistically unusual</span> a roll is</p>
                                               <p><span className="text-purple-400 font-bold">Z &gt; 2.0</span> = Lucky (top 2.5%)</p>
                                               <p><span className="text-amber-400 font-bold">Z &gt; 2.7</span> = Very lucky (top 1%)</p>
                                               <p className="text-slate-500 pt-1 text-[10px]">Higher Z = more 5★ than expected</p>
                                           </div>
                                      </div>
                                  </div>
                              </div>
                         </div>

                         <div className="space-y-6">
                             <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                                  <div className={`absolute top-0 right-0 w-32 h-32 ${winsOnlyMode ? 'bg-emerald-500/5' : 'bg-purple-500/5'} rounded-full blur-3xl`} />
                                  <div className="flex items-center justify-between mb-6">
                                      <div className="flex items-center gap-2">
                                          <Icons.Sparkles className={`w-5 h-5 ${winsOnlyMode ? 'text-emerald-500' : 'text-purple-500'}`} />
                                          <h3 className="text-xl font-bold text-white">{winsOnlyMode ? "Wins Only String" : "Lucky String"}</h3>
                                      </div>
                                      {winsOnlyMode && (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase tracking-widest">
                                              Wins Only
                                          </span>
                                      )}
                                  </div>
                                 <div className="space-y-4 relative z-10">
                                     <div>
                                         <h4 className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Shortcut String</h4>
                                          <div className={`bg-gradient-to-r ${winsOnlyMode ? 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400' : 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400'} border rounded-lg p-3 font-mono text-xl font-bold tracking-[0.2em] text-center`}>
                                              {shortcutString.string}
                                          </div>
                                     </div>
                                     {/* Sweep Path - Explicit x1/x10 sequence */}
                                     {shortcutString.path && shortcutString.path.length > 0 && (
                                       <div>
                                         <h4 className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Sweep Path <span className="text-slate-600">[x1 → x10 → Land]</span></h4>
                                         <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 space-y-1">
                                           {shortcutString.path.map((step, i) => (
                                             <div key={i} className="flex items-center justify-between font-mono text-xs">
                                               <div className="flex items-center gap-2">
                                                 <span className={`${winsOnlyMode ? 'text-emerald-400' : 'text-amber-400'}`}>{step.singles}x1</span>
                                                 <span className="text-slate-500">→</span>
                                                 <span className="text-purple-400">{step.x10s}x10</span>
                                                 <span className="text-slate-500">→</span>
                                                 <span className="text-white font-bold">#{step.landsOn}</span>
                                               </div>
                                               <span className="text-slate-500 text-[10px]">{(step.chance * 100).toFixed(1)}%</span>
                                             </div>
                                           ))}
                                         </div>
                                       </div>
                                     )}
                                     <div>
                                         <h4 className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Pre-Pity Sequence <span className="text-slate-600">[1-{softPityStart - 1}]</span></h4>
                                          <div className={`bg-slate-800/30 border border-slate-700 rounded-lg p-3 font-mono text-sm ${winsOnlyMode ? 'text-emerald-400' : 'text-amber-400'}`}>
                                              {activeAnalysis?.peaks?.filter(p => p.roll < softPityStart).slice(0, 8).map(p => p.roll).join(" - ") || "No peaks"}
                                          </div>
                                     </div>
                                      <div>
                                          <h4 className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Soft Pity Zone <span className={winsOnlyMode ? 'text-emerald-500' : 'text-purple-500'}>[{softPityStart}+]</span></h4>
                                          <div className={`border rounded-lg p-3 font-mono text-sm ${winsOnlyMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400'}`}>
                                              {activeAnalysis?.peaks?.filter(p => p.roll >= softPityStart).map(p => p.roll).join(" - ") || "No soft pity peaks"}
                                          </div>
                                      </div>
                                     <div>
                                         <h4 className="text-xs font-mono text-slate-500 mb-3 uppercase tracking-wider">All Peak Rolls</h4>
                                          <div className="grid grid-cols-4 gap-2">
                                              {activeAnalysis?.peaks?.slice(0, 12).map((p, i) => {
                                                  const zVal = parseFloat(p.zScore) || 0;
                                                  const isSuperLucky = zVal >= 2.7;
                                                  const isSoftPity = p.roll >= softPityStart;
                                                  return (
                                                      <div key={i} className={`rounded-md py-2 text-center font-mono text-xs font-bold border transition-colors
                                                          ${isSuperLucky ? "bg-amber-500/30 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]" 
                                                          : isSoftPity ? (winsOnlyMode ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-violet-500/20 border-violet-500/30 text-violet-400") 
                                                          : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-purple-500/50 hover:text-purple-400"}
                                                      `} title={`Z-score: ${p.zScore || 'N/A'}`}>
                                                          #{p.roll}
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                  )}



                  {/* Config Modal */}
                  {showInputModal && (
                      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInputModal(false)}>
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">Manual Override</h3>
                                <button onClick={() => setShowInputModal(false)} className="text-slate-500 hover:text-white text-2xl">&times;</button>
                              </div>
                              
                              {/* Game Tabs */}
                              <div className="flex gap-2 mb-4">
                                <button 
                                  onClick={() => setModalTab('hsr')}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                                    modalTab === 'hsr' 
                                      ? 'bg-purple-600 text-white' 
                                      : 'text-slate-400 hover:text-white bg-slate-800/50'
                                  }`}
                                >
                                  <img src={`${import.meta.env.BASE_URL}HSRIcon.png`} alt="HSR" className="w-5 h-5 rounded-full" />
                                  Star Rail
                                </button>
                                <button 
                                  onClick={() => setModalTab('genshin')}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                                    modalTab === 'genshin' 
                                      ? 'bg-amber-500 text-white' 
                                      : 'text-slate-400 hover:text-white bg-slate-800/50'
                                  }`}
                                >
                                  <img src={`${import.meta.env.BASE_URL}genshinIcon.png`} alt="Genshin" className="w-5 h-5 rounded-full" />
                                  Genshin
                                </button>
                                <button 
                                  onClick={() => setModalTab('wuwa')}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                                    modalTab === 'wuwa' 
                                      ? 'bg-cyan-500 text-white' 
                                      : 'text-slate-400 hover:text-white bg-slate-800/50'
                                  }`}
                                >
                                  🌊
                                  WuWa
                                </button>
                              </div>

                              {/* HSR Input */}
                              {modalTab === 'hsr' && (
                                <>
                                  <p className="text-xs text-slate-500 mb-2">Enter StarRailStation URL or Banner ID</p>
                                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 mb-4">
                                    <input
                                      type="text"
                                      placeholder="https://starrailstation.com/en/warp#2099"
                                      className="w-full bg-transparent text-sm font-mono text-purple-400 placeholder-slate-600 focus:outline-none"
                                      value={url}
                                      onChange={(e) => setUrl(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <button onClick={() => { setUrl(""); localStorage.removeItem('warp_source_url'); }} className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider">Reset</button>
                                    <button onClick={() => { 
                                      localStorage.setItem('warp_source_url', url); 
                                      setSelectedGame('hsr');
                                      handleFetch(url.includes('#') ? url.split('#')[1] : url, true); 
                                    }} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm transition-colors shadow-lg shadow-purple-900/40">
                                      Fetch HSR Data
                                    </button>
                                  </div>
                                </>
                              )}

                              {/* Genshin Input */}
                              {modalTab === 'genshin' && (
                                <>
                                  <p className="text-xs text-slate-500 mb-2">Enter Paimon.moe Banner ID (e.g., 300093 for character, 400092 for weapon)</p>
                                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 mb-4">
                                    <input
                                      type="text"
                                      placeholder="300093"
                                      className="w-full bg-transparent text-sm font-mono text-amber-400 placeholder-slate-600 focus:outline-none"
                                      value={genshinBannerId}
                                      onChange={(e) => setGenshinBannerId(e.target.value)}
                                    />
                                  </div>
                                  <div className="text-[10px] text-slate-600 mb-4 space-y-1">
                                    <p>• Character banners: 300xxx (e.g., 300093)</p>
                                    <p>• Weapon banners: 400xxx (e.g., 400092)</p>
                                    <p>• Find IDs at: paimon.moe/wish/tally</p>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <button onClick={() => { setGenshinBannerId(""); localStorage.removeItem('genshin_banner_id'); }} className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider">Reset</button>
                                    <button onClick={() => { 
                                      localStorage.setItem('genshin_banner_id', genshinBannerId); 
                                      setSelectedGame('genshin');
                                      handleFetch(genshinBannerId, true); 
                                    }} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-lg text-sm transition-colors shadow-lg shadow-amber-900/40">
                                      Fetch Genshin Data
                                    </button>
                                  </div>
                                </>
                              )}

                              {/* CUSTOM PROXY SECTION */}
                              <div className="mt-6 pt-6 border-t border-slate-700">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">⚙️ Custom CORS Proxy (Advanced)</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mb-3">
                                  If all proxies fail in your region, enter a custom CORS proxy URL. Leave empty to use built-in proxies.
                                </p>
                                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 mb-3">
                                  <input
                                    type="text"
                                    placeholder="https://your-cors-proxy.com/?url="
                                    className="w-full bg-transparent text-xs font-mono text-cyan-400 placeholder-slate-600 focus:outline-none"
                                    defaultValue={getCustomProxy()}
                                    onChange={(e) => setCustomProxy(e.target.value.trim())}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => { setCustomProxy(''); }}
                                    className="px-3 py-1.5 text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                                  >
                                    Clear Proxy
                                  </button>
                                  <span className="text-[10px] text-slate-600 flex items-center">
                                    Proxies are tried: Direct → Custom → Built-in (5 fallbacks)
                                  </span>
                                </div>
                              </div>
                          </div>
                      </div>
                  )}
                  
                   {/* PULL STRATEGY SECTION */}
                   {data && analysis && (
                       <div className="mt-6 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                           <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-6">
                                 <Icons.Target className="w-5 h-5 text-purple-500" />
                                 <h3 className="text-xl font-bold text-white">Pull Strategy</h3>
                                 <span className="ml-auto text-xs text-slate-500">{pullStrategy.length} steps calculated</span>
                              </div>
                               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                   {pullStrategy.map((step, i) => (
                                       <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-mono border ${step.type === 'x10' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                                           <span className={`font-bold ${step.type === 'x10' ? 'text-amber-400' : 'text-white'}`}>
                                               {step.type}
                                           </span>
                                           <span className="text-slate-400 text-[10px]">
                                               {step.from === 0 ? `→${step.to}` : `${step.from}→${step.to}`}
                                           </span>
                                           <span className="text-amber-400 text-[10px]">{step.chance}%</span>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       </div>
                   )}

                   {/* FOOTER CARD */}
                   <div className="mt-12 max-w-4xl mx-auto">
                       <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="text-left">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        Operational Status
                                    </h4>
                                    <p className="text-xs text-slate-500 font-mono">Ver 4.1.1 • Site Patch: Stability Enhanced</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden md:block">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Engineered for</p>
                                        <p className="text-xs font-bold text-slate-300">ASTRAL EXPRESS CREW</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-800" />
                                    <div className="flex gap-3">
                                        <div className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors cursor-help group relative">
                                            <Icons.Sparkles className="w-4 h-4 text-purple-500" />
                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Source: Svarog Engine</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-800/50">
                                <p className="text-[10px] text-slate-600 leading-relaxed max-w-2xl mx-auto uppercase tracking-tighter italic">
                                    Data sourced from <a href="https://starrailstation.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-400 underline underline-offset-2">StarRailStation.com</a> (HSR), <a href="https://paimon.moe" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400 underline underline-offset-2">Paimon.moe</a> (Genshin), and <a href="https://wuwatracker.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 underline underline-offset-2">WuWaTracker.com</a> (WuWa). This tool provides pattern analysis for global gacha statistics.
                                    Not affiliated with Cognosphere/HoYoverse/Kuro Games. May your pulls be lucky and your pities be short. ✦
                                </p>
                            </div>
                       </div>
                   </div>

               </div> {/* End Main Content Column */}
           </div> {/* End Flex Row */}
        </div> {/* End Relative Container */}
    </div>
  );
}






