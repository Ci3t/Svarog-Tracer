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
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(null);
  const [showInputModal, setShowInputModal] = useState(false);

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

  const handleFetch = async (targetId) => {
    let fetchTarget = targetId; 
    
    if (!fetchTarget) {
        const potentialUrl = url.trim() || DEFAULT_URL;
        fetchTarget = (potentialUrl.includes('#global') || potentialUrl === DEFAULT_URL) ? 'global' : potentialUrl;
    }

    const id = extractBannerId(fetchTarget) || (fetchTarget === 'global' ? 'global' : null);

    if (!id && !fetchTarget.startsWith('http')) {
        setError("Invalid Source");
        return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setShowInputModal(false);

    try {
      const stats = await fetchWarpStats(id || '2099');
      setData(stats);
    } catch (err) {
      setError(err.message);
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

  // -- STYLES (Based on Reference) --
  // Primary: cyan-500, Accent: orange-500, BG: slate-950, Card: slate-900/50
  
  // Compute pull strategy sequence (x1 vs x10 optimization based on peaks)
  const pullStrategy = useMemo(() => {
    if (!analysis || !analysis.peaks.length) return [];
    
    // Sort peaks by roll number
    const sortedPeaks = [...analysis.peaks].sort((a, b) => a.roll - b.roll);
    const strategy = [];
    let currentRoll = 0;
    
    for (const peak of sortedPeaks) {
      const targetRoll = peak.roll;
      const distance = targetRoll - currentRoll;
      
      if (distance <= 0) continue;
      
      // Calculate how many x10 pulls we can fit
      const x10Count = Math.floor(distance / 10);
      const remainder = distance % 10;
      
      if (x10Count > 0) {
        // We can do at least one x10
        const x10EndRoll = currentRoll + (x10Count * 10);
        
        // x10 segment
        strategy.push({ 
          type: 'x10', 
          from: currentRoll, 
          to: x10EndRoll, 
          result: '---', 
          chance: (peak.chance * 100).toFixed(2) 
        });
        
        // Remaining x1 to reach peak
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
        // Distance <= 9, just do singles
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

  // Best roll string for header display
  const bestRollString = useMemo(() => {
    if (!analysis || !analysis.peaks.length) return "---";
    return analysis.peaks.slice(0, 4).map(p => `#${p.roll}`).join(" → ");
  }, [analysis]);

  // SHORTCUT STRING: Calculates the simplified "6 7 1 8 6 5 6 3" style string
  // Each digit = gap % 10 (remainder after x10s) - ONLY for pre-pity peaks (first 8)
  const shortcutString = useMemo(() => {
    if (!analysis || !analysis.peaks.length) return { string: "---", pity: [] };
    
    // Only use pre-pity peaks (< 75), limit to 8 to match sequence display
    const prePityPeaks = analysis.peaks.filter(p => p.roll < 75).sort((a, b) => a.roll - b.roll).slice(0, 8);
    
    if (prePityPeaks.length === 0) return { string: "---", pity: [] };
    
    const digits = [];
    const pityNumbers = [];
    let currentPity = 0;
    
    for (const peak of prePityPeaks) {
      const gap = peak.roll - currentPity;
      const remainder = gap % 10;
      
      // Add the digit (remainder after x10s)
      digits.push(remainder.toString());
      
      // Track pity progression
      pityNumbers.push(peak.roll);
      currentPity = peak.roll;
    }
    
    return {
      string: digits.join(" "),  // Format with spaces
      pity: pityNumbers
    };
  }, [analysis]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-sans selection:bg-cyan-500 selection:text-white pb-20">
       
       <div className="relative container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          
          {/* HEADER */}
          <div className="text-center mb-12 space-y-4">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 backdrop-blur-sm border border-slate-800 mb-4 cursor-pointer hover:border-cyan-500/30 transition-colors" onClick={() => setShowInputModal(true)}>
                <Icons.Sparkles className="w-4 h-4 text-cyan-500" />
                <span className="text-sm text-slate-400 font-medium">Advanced Analytics</span>
             </div>
             
             <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 animate-pulse">
                WARP ANALYZER
             </h1>
             <p className="text-lg text-slate-500 max-w-2xl mx-auto">Decode the Gacha • Find Your Fate</p>
          </div>

          {/* BANNER SELECTION (Tabs + Grid) */}
          <div className="max-w-4xl mx-auto mb-12">
             <div className="flex justify-center mb-8">
                 <div className="grid grid-cols-2 p-1 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg w-full max-w-md">
                     <button
                         onClick={() => setBannerType('character')}
                         className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${bannerType === 'character' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                     >
                         Characters
                     </button>
                     <button
                         onClick={() => setBannerType('light_cone')}
                         className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${bannerType === 'light_cone' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
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
                                 ${isSelected ? "border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] scale-[1.02]" : "border-slate-800 hover:border-indigo-500/50 hover:scale-[1.01]"}
                                 bg-slate-900/50 backdrop-blur-sm
                             `}
                         >
                             <img src={banner.image} alt={banner.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                             <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                             <div className="absolute bottom-0 left-0 right-0 p-4">
                                 <div className="flex gap-1 mb-2">
                                     {[...Array(5)].map((_, i) => (
                                          <Icons.Star key={i} className={`w-3 h-3 ${isSelected ? "text-indigo-500 fill-indigo-500" : "text-slate-600 fill-slate-600"}`} />
                                     ))}
                                 </div>
                                 <h3 className={`text-sm font-bold uppercase tracking-wider ${isSelected ? "text-white" : "text-slate-400"}`}>{banner.name}</h3>
                             </div>
                              {isSelected && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_#6366f1]" />}
                         </div>
                     )
                 })}
             </div>
          </div>

          {/* INITIATE BUTTON */}
          <div className="flex justify-center mb-16">
             <button
                 onClick={() => handleFetch()}
                 disabled={loading}
                      className={`
                          group relative px-8 py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                          disabled:opacity-50 disabled:cursor-not-allowed min-w-[300px] flex items-center justify-center gap-3 overflow-hidden
                      `}
             >
                 <span className="relative z-10">{loading ? "DECRYPTING..." : "INITIATE DECRYPTION"}</span>
                 <Icons.Zap className={`w-5 h-5 relative z-10 ${loading ? "animate-spin" : "group-hover:rotate-12 transition-transform"}`} />
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
             </button>
          </div>

          {/* ANALYTICS GRID */}
          {data && analysis && (
             <div className="grid lg:grid-cols-3 gap-6 items-start animate-in fade-in slide-in-from-bottom-8 duration-700">
                 
                 {/* MAIN CONTENT AREA */}
                 <div className="lg:col-span-2 space-y-6">
                     {/* DISTRIBUTION CHART */}
                     <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
                         <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-2">
                                  <Icons.BarChart3 className="w-5 h-5 text-indigo-500" />
                                  <h3 className="text-xl font-bold text-white">Distribution</h3>
                              </div>
                              <div className="flex bg-slate-800/50 rounded-lg p-1">
                                  <button onClick={() => setChartView('count')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${chartView === 'count' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-white"}`}>Count</button>
                                  <button onClick={() => setChartView('chance')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${chartView === 'chance' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-white"}`}>Chance %</button>
                              </div>
                         </div>
                         
                         <div className="relative h-[200px] w-full pt-8">
                             <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-[10px] text-slate-600 font-mono">
                                 {[100, 75, 50, 25, 0].map(v => <span key={v}>{v}</span>)}
                             </div>
                             <div className="ml-8 h-full flex items-end gap-[2px] pb-6">
                                 {chartData.map((d, i) => {
                                     const val = chartView === 'count' ? d.count : d.chance;
                                     const max = chartView === 'count' ? maxCount : maxChance;
                                     const height = Math.max((val / max) * 100, 2);
                                     const peakInfo = analysis.peaks.find(p => p.roll === d.roll);
                                     const isPeak = !!peakInfo;
                                     const highlighting = i >= 73 && i <= 83; // Soft pity
                                     const zScore = peakInfo ? peakInfo.zScore : null;
                                     
                                     return (
                                         <div 
                                             key={i}
                                             className={`flex-1 rounded-t-sm transition-all duration-300 hover:opacity-80 group relative cursor-pointer
                                              ${isPeak ? "bg-indigo-400 shadow-[0_0_8px_#818cf8] z-10" : highlighting ? "bg-violet-600" : "bg-slate-700"}
                                          `}
                                          style={{ height: `${height}%` }}
                                      >
                                          {/* Hover Tooltip with Z-score */}
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 border border-slate-700 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                              <div className="font-bold">Roll #{d.roll}</div>
                                              <div className="text-slate-400">{chartView === 'count' ? 'Count' : 'Chance'}: {val.toFixed(2)}</div>
                                              {zScore && <div className="text-indigo-400 font-mono">Z: {zScore}</div>}
                                          </div>
                                         </div>
                                     )
                                 })}
                             </div>
                             
                             {/* X-AXIS */}
                              <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] text-slate-600 font-mono text-center">
                                  <span>1</span>
                                  <span>Soft Pity (74)</span>
                                  <span>90</span>
                              </div>
                          </div>

                          {/* GUIDES - Merged back into Chart Card */}
                          <div className="mt-6 pt-6 border-t border-slate-800/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* HOW TO USE SHORTCUT */}
                              <div className="bg-slate-800/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                      <Icons.Target className="w-4 h-4 text-indigo-400" />
                                      <span className="text-xs font-bold text-white uppercase tracking-wider">How to Use Shortcut</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 space-y-1">
                                      <p><span className="text-indigo-400 font-bold">1.</span> Each digit = <span className="text-white font-bold">single pulls</span></p>
                                      <p><span className="text-indigo-400 font-bold">2.</span> After digit, do <span className="text-violet-400 font-bold">x10 pull</span></p>
                                      <p><span className="text-indigo-400 font-bold">3.</span> Repeat until 5★</p>
                                      <p className="text-slate-500 pt-1 text-[10px]"><span className="text-indigo-400 font-bold">0</span>=skip singles | Ex: <span className="text-indigo-400">6</span>→<span className="text-violet-400">x10</span>→<span className="text-indigo-400">7</span>...</p>
                                  </div>
                              </div>
                              
                              {/* WHAT IS Z-SCORE */}
                              <div className="bg-slate-800/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                      <Icons.TrendingUp className="w-4 h-4 text-indigo-400" />
                                      <span className="text-xs font-bold text-white uppercase tracking-wider">What is Z-Score?</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 space-y-1">
                                      <p>How <span className="text-white font-bold">statistically unusual</span> a roll is</p>
                                      <p><span className="text-violet-400 font-bold">Z &gt; 2.0</span> = Lucky (top 2.5%)</p>
                                      <p><span className="text-indigo-400 font-bold">Z &gt; 2.5</span> = Very lucky (top 1%)</p>
                                      <p className="text-slate-500 pt-1 text-[10px]">Higher Z = more 5★ than expected</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                 </div>

                 {/* SIDEBAR STATS */}
                 <div className="space-y-6">
                     
                     {/* LUCKY STRINGS */}
                     <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
                          <div className="flex items-center gap-2 mb-6">
                              <Icons.Sparkles className="w-5 h-5 text-indigo-500" />
                              <h3 className="text-xl font-bold text-white">Lucky String</h3>
                          </div>
                         
                         <div className="space-y-4 relative z-10">
                             {/* SHORTCUT STRING - Above sequences */}
                             <div>
                                 <h4 className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Shortcut String</h4>
                                  <div className="bg-gradient-to-r from-indigo-500/20 to-violet-500/10 border border-indigo-500/30 rounded-lg p-3 font-mono text-xl font-bold text-indigo-400 tracking-[0.2em] text-center">
                                      {shortcutString.string}
                                  </div>
                             </div>
                             
                             {/* Pre-Pity Lucky Sequence (rolls < 75) */}
                             <div>
                                 <h4 className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Pre-Pity Sequence <span className="text-slate-600">[1-74]</span></h4>
                                  <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 font-mono text-sm text-indigo-400">
                                      {analysis.peaks.filter(p => p.roll < 75).slice(0, 8).map(p => p.roll).join(" - ") || "No peaks"}
                                  </div>
                             </div>
                             
                             {/* Soft Pity Zone (rolls >= 75) */}
                              <div>
                                  <h4 className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Soft Pity Zone <span className="text-violet-500">[75+]</span></h4>
                                  <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3 font-mono text-sm text-violet-400">
                                      {analysis.peaks.filter(p => p.roll >= 75).map(p => p.roll).join(" - ") || "No soft pity peaks"}
                                  </div>
                              </div>
                             
                             {/* Anomalies Grid */}
                             <div>
                                 <h4 className="text-xs font-mono text-slate-500 mb-3 uppercase tracking-wider">All Peak Rolls</h4>
                                  <div className="grid grid-cols-4 gap-2">
                                      {analysis.peaks.slice(0, 12).map((p, i) => (
                                          <div key={i} className={`rounded-md py-2 text-center font-mono text-xs font-bold border transition-colors ${p.roll >= 75 ? "bg-violet-500/20 border-violet-500/30 text-violet-400" : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-400"}`} title={`Z-score: ${p.zScore || 'N/A'}`}>
                                              #{p.roll}
                                          </div>
                                      ))}
                                  </div>
                             </div>
                         </div>
                     </div>

                      {/* METRICS - Hidden per user request */}
                      {/*
                      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
                         <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors group">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                     <Icons.TrendingUp className="w-5 h-5 text-indigo-500" />
                                 </div>
                                 <div>
                                     <p className="text-xs text-slate-500 uppercase tracking-wide">Total Pulls</p>
                                     <p className="text-xl font-bold tabular-nums text-white group-hover:text-indigo-400 transition-colors">{analysis.metrics.total5Stars.toLocaleString()}</p>
                                 </div>
                             </div>
                             <span className="text-xs text-indigo-500 font-bold">5★ RECORDS</span>
                         </div>
                         
                         <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors group">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                     <Icons.Target className="w-5 h-5 text-indigo-500" />
                                 </div>
                                 <div>
                                     <p className="text-xs text-slate-500 uppercase tracking-wide">Average Pity</p>
                                     <p className="text-xl font-bold tabular-nums text-indigo-500">#{analysis.metrics.avgRoll || analysis.metrics.medianRoll}</p>
                                 </div>
                             </div>
                             <span className="text-xs text-indigo-500/70">AVG</span>
                         </div>
                         
                         <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors group">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                     <Icons.Sparkles className="w-5 h-5 text-purple-500" />
                                 </div>
                                 <div>
                                     <p className="text-xs text-slate-500 uppercase tracking-wide">Peak Coverage</p>
                                     <p className="text-xl font-bold tabular-nums text-purple-500">{analysis.peaks.length} <span className="text-sm">peaks</span></p>
                                 </div>
                             </div>
                             <span className="text-xs text-purple-500/70">{analysis.peaks.filter(p => p.roll < 75).length} pre-pity</span>
                         </div>
                      </div>
                      */}

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
                               className="w-full bg-transparent text-sm font-mono text-indigo-400 placeholder-slate-600 focus:outline-none"
                               value={url}
                               onChange={(e) => setUrl(e.target.value)}
                           />
                      </div>

                      <div className="flex justify-between items-center">
                          <button onClick={() => { setUrl(""); localStorage.removeItem('warp_source_url'); }} className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider">Reset Default</button>
                           <button onClick={() => { localStorage.setItem('warp_source_url', url); handleFetch(); }} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition-colors">Save Strategy</button>
                      </div>
                  </div>
              </div>
          )}
          
          {/* PULL STRATEGY SECTION - Full Width Below Grid */}
          {data && analysis && (
              <div className="mt-6 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
                      <div className="flex items-center gap-2 mb-4">
                         <Icons.Target className="w-5 h-5 text-indigo-500" />
                         <h3 className="text-xl font-bold text-white">Pull Strategy</h3>
                         <span className="ml-auto text-xs text-slate-500">{pullStrategy.length} steps calculated</span>
                     </div>
                  
                  {/* Strategy Sequence Grid */}
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                       {pullStrategy.map((step, i) => (
                           <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-mono border ${step.type === 'x10' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                               <span className={`font-bold ${step.type === 'x10' ? 'text-indigo-400' : 'text-white'}`}>
                                   {step.type}
                               </span>
                               <span className="text-slate-400 text-[10px]">
                                   {step.from === 0 ? `→${step.to}` : `${step.from}→${step.to}`}
                               </span>
                               <span className="text-indigo-400 text-[10px]">{step.chance}%</span>
                           </div>
                       ))}
                   </div>
              </div>
          )}

       </div>
    </div>
  );
}
