import React, { useState, useMemo, useEffect } from "react";
import { extractBannerId, fetchWarpStats, detectLuckyPeaks, calculateWarpMetrics, PRESET_BANNERS, fetchLiveBanners } from "../utils/warpDataService";

// -- ICONS (Lucide Clones) --
const Icons = {
  Sparkles: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  Zap: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  BarChart3: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
  TrendingUp: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Target: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Star: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  ChevronRight: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>,
  ChevronLeft: ({ className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6"/></svg>
};

export default function WarpAnalyzer() {
  const [url, setUrl] = useState(() => localStorage.getItem('warp_source_url') || "");
  const [banners, setBanners] = useState(PRESET_BANNERS);
  const [selectedBannerId, setSelectedBannerId] = useState(PRESET_BANNERS[0]?.id); 
  const [bannerType, setBannerType] = useState('character');
  const [chartView, setChartView] = useState('count'); // 'count' | 'chance'

  const [data, setData] = useState(null);
  const [cachedData, setCachedData] = useState({}); // Banner ID -> Data
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'cache' | 'fetch' }

  const DEFAULT_URL = "https://starrailstation.com/en/warp#global";

  // -- LOGIC --
  useEffect(() => {
    fetchLiveBanners(true).then(result => {
        if (result.data && result.data.length > 0) {
            setBanners(result.data);
            if (!result.data.find(b => b.id === selectedBannerId)) {
                setSelectedBannerId(result.data[0].id);
            }
        }
    }).catch(e => console.warn(e));
  }, []);

  const handleFetch = async (targetId, force = false) => {
    let fetchTarget = targetId || selectedBannerId; 
    
    if (!targetId && !url.trim()) {
        const potentialUrl = url.trim() || DEFAULT_URL;
        fetchTarget = (potentialUrl.includes('#global') || potentialUrl === DEFAULT_URL) ? 'global' : potentialUrl;
    }

    const id = extractBannerId(fetchTarget) || (fetchTarget === 'global' ? 'global' : fetchTarget);

    if (!id) {
        setError("Invalid Source");
        return;
    }

    // API GUARD: Don't refetch if we have data for this ID unless forced
    if (!force && cachedData[id]) {
        console.log(`[API GUARD] Using cached data for: ${id}`);
        setData(cachedData[id]);
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
      const stats = await fetchWarpStats(id === 'global' ? '2099' : id);
      setData(stats);
      setCachedData(prev => ({ ...prev, [id]: stats }));
      setToast({ message: '✓ Data updated!', type: 'cache' });
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setError(err.message);
      setToast(null);
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo(() => {
    if (!data || !data.stats) return null;
    const pulls5 = data.stats.by_rollnum_pulls_5 || {};
    const chance5 = data.stats.by_rollnum_chance_5 || {};
    const peaks = detectLuckyPeaks(pulls5, chance5);
    const metrics = calculateWarpMetrics(data.stats);
    return { peaks, metrics };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data || !data.stats) return [];
    const pulls5 = data.stats.by_rollnum_pulls_5 || {};
    const chance5 = data.stats.by_rollnum_chance_5 || {};
    return Array.from({ length: 90 }, (_, i) => ({
      roll: i + 1,
      count: pulls5[i + 1] || 0,
      chance: chance5[i + 1] || 0
    }));
  }, [data]);

  const maxCount = useMemo(() => Math.max(...chartData.map(d => d.count), 1), [chartData]);
  const maxChance = useMemo(() => Math.max(...chartData.map(d => d.chance), 0.001), [chartData]);
  const activeBanners = useMemo(() => banners.filter(b => b.type === bannerType), [banners, bannerType]);

  const pullStrategy = useMemo(() => {
    if (!analysis || !analysis.peaks.length) return [];
    const sortedPeaks = [...analysis.peaks].sort((a, b) => a.roll - b.roll);
    const strategy = [];
    let currentRoll = 0;
    for (const peak of sortedPeaks) {
      const targetRoll = peak.roll;
      const distance = targetRoll - currentRoll;
      if (distance <= 0) continue;
      const x10Count = Math.floor(distance / 10);
      const remainder = distance % 10;
      if (x10Count > 0) {
        const x10EndRoll = currentRoll + (x10Count * 10);
        strategy.push({ 
          type: 'x10', 
          from: currentRoll, 
          to: x10EndRoll, 
          result: '---', 
          chance: (peak.chance * 100).toFixed(2) 
        });
        if (remainder > 0) {
          strategy.push({ 
            type: 'x1', 
            from: x10EndRoll, 
            to: targetRoll, 
            result: '---', 
            chance: (peak.chance * 100).toFixed(2) 
          });
        }
      } else {
        strategy.push({ 
          type: 'x1', 
          from: currentRoll, 
          to: targetRoll, 
          result: '---', 
          chance: (peak.chance * 100).toFixed(2) 
        });
      }
      currentRoll = targetRoll;
    }
    return strategy;
  }, [analysis]);

    const softPityStart = bannerType === 'character' ? 75 : 65;
    const softPityEnd = bannerType === 'character' ? 90 : 80;

    const shortcutString = useMemo(() => {
    if (!analysis || !analysis.peaks.length) return { string: "---", pity: [] };
    const prePityPeaks = analysis.peaks.filter(p => p.roll < softPityStart).sort((a, b) => a.roll - b.roll).slice(0, 8);
    if (prePityPeaks.length === 0) return { string: "---", pity: [] };
    const digits = [];
    const pityNumbers = [];
    let currentPity = 0;
    for (const peak of prePityPeaks) {
      const gap = peak.roll - currentPity;
      const remainder = gap % 10;
      digits.push(remainder.toString());
      pityNumbers.push(peak.roll);
      currentPity = peak.roll;
    }
    return {
      string: digits.join(" "),
      pity: pityNumbers
    };
  }, [analysis]);

  const currentBanner = useMemo(() => {
    return banners.find(b => b.id === selectedBannerId) || activeBanners[0] || PRESET_BANNERS[0];
  }, [banners, selectedBannerId, activeBanners]);

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

        {/* GLOBAL BACKGROUND ELEMENTS */}
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

                  {/* BANNER SELECTION (Tabs + Grid) */}
                  <div className="max-w-4xl mx-auto mb-12">
                     <div className="flex justify-center mb-8">
                         <div className="grid grid-cols-2 p-1 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg w-full max-w-md">
                              <button
                                  onClick={() => setBannerType('character')}
                                  className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${bannerType === 'character' ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40" : "text-slate-400 hover:text-white"}`}
                              >
                                  Characters
                              </button>
                              <button
                                  onClick={() => setBannerType('light_cone')}
                                  className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${bannerType === 'light_cone' ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40" : "text-slate-400 hover:text-white"}`}
                              >
                                  Light Cones
                              </button>
                         </div>
                     </div>

                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {activeBanners.map(banner => {
                             const isSelected = selectedBannerId === banner.id;
                             return (
                                 <div 
                                     key={banner.id}
                                     onClick={() => { setSelectedBannerId(banner.id); handleFetch(banner.id); }}
                                     className={`
                                          group cursor-pointer relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-300
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
                                     </div>
                                      {isSelected && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" />}
                                 </div>
                             )
                         })}
                     </div>
                  </div>

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
                                       </div>
                                       <div className="flex bg-slate-800/50 rounded-lg p-1">
                                          <button onClick={() => setChartView('count')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${chartView === 'count' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-white"}`}>Count</button>
                                          <button onClick={() => setChartView('chance')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${chartView === 'chance' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-white"}`}>Chance %</button>
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
                                             const peakInfo = analysis.peaks.find(p => p.roll === d.roll);
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
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
                                  <div className="flex items-center gap-2 mb-6">
                                      <Icons.Sparkles className="w-5 h-5 text-purple-500" />
                                      <h3 className="text-xl font-bold text-white">Lucky String</h3>
                                  </div>
                                 <div className="space-y-4 relative z-10">
                                     <div>
                                         <h4 className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Shortcut String</h4>
                                          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-lg p-3 font-mono text-xl font-bold text-amber-400 tracking-[0.2em] text-center">
                                              {shortcutString.string}
                                          </div>
                                     </div>
                                     <div>
                                         <h4 className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Pre-Pity Sequence <span className="text-slate-600">[1-{softPityStart - 1}]</span></h4>
                                          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 font-mono text-sm text-amber-400">
                                              {analysis.peaks.filter(p => p.roll < softPityStart).slice(0, 8).map(p => p.roll).join(" - ") || "No peaks"}
                                          </div>
                                     </div>
                                      <div>
                                          <h4 className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Soft Pity Zone <span className="text-purple-500">[{softPityStart}+]</span></h4>
                                          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 font-mono text-sm text-purple-400">
                                              {analysis.peaks.filter(p => p.roll >= softPityStart).map(p => p.roll).join(" - ") || "No soft pity peaks"}
                                          </div>
                                      </div>
                                     <div>
                                         <h4 className="text-xs font-mono text-slate-500 mb-3 uppercase tracking-wider">All Peak Rolls</h4>
                                          <div className="grid grid-cols-4 gap-2">
                                              {analysis.peaks.slice(0, 12).map((p, i) => {
                                                  const zVal = parseFloat(p.zScore) || 0;
                                                  const isSuperLucky = zVal >= 2.7;
                                                  const isSoftPity = p.roll >= softPityStart;
                                                  return (
                                                      <div key={i} className={`rounded-md py-2 text-center font-mono text-xs font-bold border transition-colors
                                                          ${isSuperLucky ? "bg-amber-500/30 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]" 
                                                          : isSoftPity ? "bg-violet-500/20 border-violet-500/30 text-violet-400" 
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
                              <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white">Source Configuration</h3>
                                <button onClick={() => setShowInputModal(false)} className="text-slate-500 hover:text-white">&times;</button>
                              </div>
                              <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 mb-6">
                                   <input
                                       type="text"
                                       placeholder="https://starrailstation.com/en/warp#global"
                                       className="w-full bg-transparent text-sm font-mono text-purple-400 placeholder-slate-600 focus:outline-none"
                                       value={url}
                                       onChange={(e) => setUrl(e.target.value)}
                                   />
                              </div>
                              <div className="flex justify-between items-center">
                                  <button onClick={() => { setUrl(""); localStorage.removeItem('warp_source_url'); }} className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider">Reset Default</button>
                                   <button onClick={() => { localStorage.setItem('warp_source_url', url); handleFetch(null, true); }} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm transition-colors shadow-lg shadow-purple-900/40">Save Strategy</button>
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
                                    <p className="text-xs text-slate-500 font-mono">Ver 3.8.3 • Site Patch: Stability Enhanced</p>
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
                                    Warp data sourced from <a href="https://starrailstation.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-400 underline underline-offset-2">StarRailStation.com</a>. This tool provides pattern analysis for their global warp statistics.
                                    Not affiliated with Cognosphere/HoYoverse. May your pulls be lucky and your pities be short. ✦
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
