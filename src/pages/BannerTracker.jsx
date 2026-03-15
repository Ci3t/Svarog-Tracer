import React, { useState, useEffect, useRef } from 'react';
import { getBannerHistory, fetchCharacterMetadataMap } from '../utils/warpDataService';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';

const BannerTracker = () => {
    const [history, setHistory] = useState([]);
    const [metadata, setMetadata] = useState({});
    const [gridData, setGridData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [modalData, setModalData] = useState(null);
    const [versionFilter, setVersionFilter] = useState('all');
    const baseUrl = import.meta.env.BASE_URL;
    
    const gridRef = useRef(null);
    const topScrollRef = useRef(null);
    const bottomScrollRef = useRef(null);
    const predictorRef = useRef(null);

    useEffect(() => {
        const init = async () => {
            const hist = getBannerHistory();
            setHistory(hist);
            const meta = await fetchCharacterMetadataMap();
            setMetadata(meta);
            setLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        if (loading || !history.length) return;

        // 1. Flatten Phases
        const flatPhases = [];
        history.forEach(v => {
            v.phases.forEach(p => {
                flatPhases.push({
                    version: v.version,
                    phase: p.phase,
                    label: `${v.version}-${p.phase}`,
                    characters: p.characters
                });
            });
        });

        // Apply version filter
        const filteredPhases = flatPhases.filter(p => {
            const majorVersion = parseFloat(p.version.split('.')[0]);
            if (versionFilter === '1.0+') return true;
            if (versionFilter === '2.0+') return majorVersion >= 2;
            if (versionFilter === '3.0+') return majorVersion >= 3;
            return true; // 'all'
        });

        // 2. Identify All Characters & First Appearance
        const charAppearance = {};
        const allChars = new Set();
        
        filteredPhases.forEach((p, index) => {
            p.characters.forEach(name => {
                allChars.add(name);
                if (charAppearance[name] === undefined) {
                    charAppearance[name] = index;
                }
            });
        });

        const sortedChars = Array.from(allChars).sort((a, b) => {
            return charAppearance[b] - charAppearance[a];
        });

        const rows = sortedChars.map(char => {
            let lastAppearanceIndex = -1;
            const releaseIndex = charAppearance[char];
            
            const cells = filteredPhases.map((phase, index) => {
                const isFeatured = phase.characters.includes(char);
                let cellData = { type: 'none', value: null, isFeatured: false };

                if (isFeatured) {
                    cellData = { type: 'image', value: char, isFeatured: true };
                    lastAppearanceIndex = index;
                } else {
                    if (index > releaseIndex) {
                        const drought = index - lastAppearanceIndex;
                        cellData = { type: 'count', value: drought, isFeatured: false };
                    } else if (index === releaseIndex) {
                        cellData = { type: 'image', value: char, isFeatured: true };
                    } else {
                        cellData = { type: 'none', value: null, isFeatured: false };
                    }
                }
                return cellData;
            });
            
            const appearances = cells.filter(c => c.type === 'image').length;
            const currentDrought = cells.slice().reverse().findIndex(c => c.type === 'image');
            const lastAppVersion = currentDrought >= 0 ? filteredPhases[filteredPhases.length - 1 - currentDrought].version : 'Never';
            
            return { 
                name: char, 
                cells,
                stats: {
                    firstAppearance: filteredPhases[releaseIndex]?.version || 'N/A',
                    lastAppearance: lastAppVersion,
                    totalAppearances: appearances,
                    currentDrought: currentDrought >= 0 ? currentDrought : 0
                }
            };
        });

        // Apply search filter
        const filteredRows = rows.filter(row => 
            row.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const reversedColumns = [...filteredPhases].reverse();
        const reversedRows = filteredRows.map(row => ({
            ...row,
            cells: [...row.cells].reverse()
        }));

        setGridData({ columns: reversedColumns, rows: reversedRows });

    }, [history, metadata, loading, versionFilter, searchTerm]);

    useEffect(() => {
        if (!gridData || !gridRef.current) return;
        
        // Preditor Cards Animation
        const predictorCards = document.querySelectorAll('.predictor-card');
        gsap.fromTo(predictorCards, 
            { opacity: 0, scale: 0.9, x: 20 }, 
            { opacity: 1, scale: 1, x: 0, duration: 0.5, stagger: 0.05, ease: 'back.out(1.7)', delay: 0.2 }
        );

        // Grid Rows Animation
        const rows = gridRef.current.querySelectorAll('tbody tr');
        gsap.fromTo(rows, 
            { opacity: 0, x: -10 }, 
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.01, ease: 'power2.out', delay: 0.1 }
        );
    }, [gridData]);

    // Synchronize Scrollbars
    useEffect(() => {
        const topScroll = topScrollRef.current;
        const bottomScroll = bottomScrollRef.current;
        if (!topScroll || !bottomScroll) return;

        const handleTopScroll = () => {
            bottomScroll.scrollLeft = topScroll.scrollLeft;
        };
        const handleBottomScroll = () => {
            topScroll.scrollLeft = bottomScroll.scrollLeft;
        };

        topScroll.addEventListener('scroll', handleTopScroll);
        bottomScroll.addEventListener('scroll', handleBottomScroll);

        return () => {
            topScroll.removeEventListener('scroll', handleTopScroll);
            bottomScroll.removeEventListener('scroll', handleBottomScroll);
        };
    }, [gridData]);

    const getImg = (name) => metadata[name] || "";

    const SHOP_CHARACTERS = ['Topaz', 'Ruan Mei', 'Luocha'];

    const handleCellClick = (char, stats) => {
        setModalData({ char, stats, img: getImg(char) });
    };

    const closeModal = () => setModalData(null);

    const getTopPredictions = () => {
        if (!gridData) return [];
        const standardBanner = ['Bronya', 'Welt', 'Gepard', 'Bailu', 'Himeko', 'Clara', 'Yanqing', 'Seele', 'Fu Xuan', 'Blade'];
        return gridData.rows
            .filter(row => !standardBanner.includes(row.name) && !SHOP_CHARACTERS.includes(row.name))
            .map(row => ({
                name: row.name,
                drought: row.stats.currentDrought,
                img: getImg(row.name),
                stats: row.stats
            }))
            .filter(p => p.drought > 0)
            .sort((a, b) => b.drought - a.drought)
            .slice(0, 6);
    };

    const getShopCharacters = () => {
        if (!gridData) return [];
        return gridData.rows
            .filter(row => SHOP_CHARACTERS.includes(row.name))
            .map(row => ({
                name: row.name,
                img: getImg(row.name),
                stats: row.stats
            }));
    };

    if (loading || !gridData) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-t-purple-500 border-slate-800 rounded-full animate-spin"></div>
            </div>
        );
    }

    const predictions = getTopPredictions();

    return (
        <div className="relative min-h-screen bg-[#020617] text-slate-100 selection:bg-purple-500 selection:text-white font-sans overflow-x-hidden">
            
            {/* CINEMATIC ATMOSPHERE */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%]" />
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <img 
                    src={`${baseUrl}clara.jpg`} 
                    alt="Backdrop" 
                    className="w-full h-full object-cover opacity-[0.35] brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617]" />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-6 flex flex-col min-h-screen">
                
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/90 transition-all group cursor-pointer shadow-lg">
                            <svg className="w-6 h-6 text-slate-400 group-hover:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Banner Tracker</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Svarog Network - Observation Node</div>
                                <div className="h-3 w-px bg-slate-800 mx-2" />
                                <div className="text-[9px] font-medium text-slate-500 italic max-w-sm border-l border-purple-500/20 pl-3">
                                    Forecast protocol: Final call from <span className="text-slate-300">HoYoverse</span>. Monitor social media.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex gap-1.5 bg-slate-900/40 p-1.5 rounded-xl border border-slate-800/80 backdrop-blur-xl">
                            {['ALL', '1.0+', '2.0+', '3.0+'].map(f => (
                                <button 
                                    key={f}
                                    onClick={() => setVersionFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${versionFilter === f ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <div className="px-5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 border-dashed">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">SYS STATUS</div>
                            <div className="text-[10px] font-black text-emerald-400 animate-pulse uppercase">OPERATIONAL</div>
                        </div>
                    </div>
                </div>

                <div className="mb-6 flex gap-3 overflow-x-auto pb-4 scrollbar-hide items-stretch">
                    <div className="flex-shrink-0 w-48 h-[68px] p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-3xl relative overflow-hidden group predictor-card flex flex-col justify-center">
                        <div className="text-[8px] font-black text-purple-400 uppercase tracking-[0.3em] mb-1">Forecasting</div>
                        <h2 className="text-sm font-black text-white italic leading-tight">Projected Reruns</h2>
                        <div className="mt-2 w-8 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 shadow-[0_0_10px_#a855f7]" />
                        <span className="absolute -bottom-1 -right-1 text-3xl opacity-10 group-hover:opacity-20 transition-all rotate-12 group-hover:scale-110">🔮</span>
                    </div>

                    {predictions.map((p, idx) => (
                        <div 
                            key={p.name}
                            onClick={() => handleCellClick(p.name, p.stats)}
                            className="flex-shrink-0 w-44 h-[68px] group cursor-pointer relative p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-3xl hover:border-purple-500/50 hover:bg-slate-900/80 transition-all duration-300 flex items-center predictor-card"
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-800 group-hover:border-purple-500/40 transition-colors flex-shrink-0">
                                    <img src={p.img} alt={p.name} className="w-full h-full object-cover scale-110" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">{p.name}</div>
                                    <div className="text-xs font-black text-white group-hover:text-purple-400 transition-colors uppercase italic">{p.drought} P</div>
                                </div>
                            </div>
                            <div className="absolute top-1.5 right-3 text-[8px] font-black text-white/5 italic">#{idx+1}</div>
                        </div>
                    ))}
                </div>

                <div className="mb-8 p-3 rounded-2xl bg-purple-900/5 border border-purple-500/10 backdrop-blur-3xl">
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div className="w-1 h-4 bg-purple-500 rounded-full" />
                        <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Vaulted Signals: Memorial Shop</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {getShopCharacters().map((p) => (
                            <div 
                                key={p.name}
                                onClick={() => handleCellClick(p.name, p.stats)}
                                className="group cursor-pointer relative p-3 rounded-xl bg-slate-900/40 border border-slate-800/50 hover:border-purple-500/30 hover:bg-slate-900/60 transition-all flex items-center h-[62px]"
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-800 group-hover:border-purple-500/30 flex-shrink-0 grayscale-[0.6] group-hover:grayscale-0 transition-all">
                                        <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">{p.name}</div>
                                        <div className="inline-flex px-1.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[8px] font-black text-purple-400 uppercase tracking-tighter mt-0.5">Shop</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <p className="mt-3 px-2 text-[9px] font-medium text-slate-500 italic flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        Memorial Shop protocols active. Standard rerun monitoring suspended for these identifier signals as they are currently available via special exchange.
                    </p>
                </div>

                {/* MAIN OBSERVATION GRID */}
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        height: 6px;
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(15, 23, 42, 0.4);
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: linear-gradient(to right, #6366f1, #a855f7);
                        border-radius: 10px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: linear-gradient(to right, #4f46e5, #9333ea);
                    }
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>

                <div className="flex-1 rounded-[3rem] bg-slate-900/40 border border-slate-800/80 backdrop-blur-3xl shadow-2xl overflow-hidden flex flex-col glacial-card">
                    
                    <div className="px-10 py-3 bg-slate-950/40 border-b border-white/[0.03]">
                        <div ref={topScrollRef} className="overflow-x-auto h-2 custom-scrollbar">
                            <div style={{ width: `${gridData.columns.length * 75 + 180}px`, height: '1px' }} />
                        </div>
                    </div>

                    <div 
                        ref={bottomScrollRef} 
                        className="overflow-auto flex-1 custom-scrollbar"
                    >
                        <table ref={gridRef} className="w-max border-collapse">
                            <thead className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-2xl">
                                <tr>
                                    <th className="sticky left-0 z-40 bg-slate-900/95 p-0 border-b border-r border-slate-800/60 min-w-[180px]">
                                        <div className="p-4 text-left first:rounded-tl-[2rem] border-r border-white/5 last:border-r-0">
                                            <div className="flex items-center gap-4">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Target Identifier</div>
                                                <div className="h-6 w-px bg-slate-800" />
                                                {/* SEARCH FILTER SUGGESTION */}
                                                <div className="relative group">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-focus-within:text-purple-500 transition-colors">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Quick Search..."
                                                        spellCheck="false"
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="bg-slate-950/60 border border-slate-800 hover:border-purple-500/30 focus:border-purple-500/50 rounded-lg pl-9 pr-3 py-1.5 text-[10px] text-white focus:outline-none transition-all w-48 placeholder:text-slate-600 shadow-inner"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </th>
                                    {gridData.columns.map((col, i) => (
                                        <th key={i} className="p-0 border-b border-slate-800/60 border-r border-slate-800/20 min-w-[75px] text-center">
                                            <div className="py-5 px-3">
                                                <div className="text-[11px] font-black text-white mb-0.5">{col.version}</div>
                                                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">P{col.phase}</div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {gridData.rows.map((row) => (
                                    <tr 
                                        key={row.name} 
                                        className="group hover:bg-white/[0.02] transition-colors border-b border-slate-800/20 cursor-pointer"
                                        onClick={() => handleCellClick(row.name, row.stats)}
                                    >
                                        <td className="sticky left-0 z-20 bg-slate-900/95 group-hover:bg-slate-800/90 transition-all border-r border-slate-800/60 p-0 cursor-pointer">
                                            <div className="flex items-center gap-4 p-4 w-[180px]">
                                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group-hover:border-purple-500/40 transition-all">
                                                    {getImg(row.name) ? (
                                                        <img src={getImg(row.name)} alt={row.name} className="w-full h-full object-cover transition-all duration-300" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-700 font-black">NA</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] font-black text-white truncate uppercase tracking-tight group-hover:text-purple-400 transition-colors">{row.name}</div>
                                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">{row.stats.currentDrought} P Rerun</div>
                                                </div>
                                            </div>
                                        </td>
                                        {row.cells.map((cell, i) => {
                                            let cellStyle = "bg-transparent";
                                            let content = <span className="text-slate-800 text-xs opacity-20">—</span>;

                                            if (cell.type === 'image') {
                                                cellStyle = "bg-purple-900/10";
                                                content = (
                                                    <div className="p-1.5 h-full w-full flex items-center justify-center">
                                                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-purple-500/20 group-hover:scale-110 group-hover:border-purple-500/60 transition-all shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                                            <img src={getImg(row.name)} alt={row.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    </div>
                                                );
                                            } else if (cell.type === 'count') {
                                                const colorClass = cell.value < 6 ? "text-green-500/70" : cell.value < 12 ? "text-yellow-500/70" : cell.value < 18 ? "text-orange-500/70" : "text-red-500/70";
                                                content = <span className={`font-mono font-black text-[15px] ${colorClass}`}>{cell.value}</span>;
                                            }

                                            return (
                                                <td key={i} className={`p-0 border-r border-slate-800/10 w-[75px] h-[64px] text-center transition-all ${cellStyle}`} onClick={() => cell.type !== 'none' && handleCellClick(row.name, row.stats)}>
                                                    {content}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL */}
                {modalData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4" onClick={closeModal}>
                        <div className="bg-slate-900/90 border border-white/5 rounded-[2.5rem] p-8 max-w-lg w-full relative overflow-hidden group shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 shadow-[0_0_20px_#a855f7]" />
                            <div className="flex gap-8">
                                <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.25)] flex-shrink-0">
                                    <img src={modalData.img} alt={modalData.char} className="w-full h-full object-cover scale-110" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[9px] font-black text-purple-400 uppercase tracking-[0.4em] mb-2">Observation Record</div>
                                    <h3 className="text-3xl font-black text-white tracking-tighter mb-6 leading-none italic uppercase">{modalData.char}</h3>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { l: "First Contact", v: `Ver. ${modalData.stats.firstAppearance}` },
                                            { l: "Last Snapshot", v: `Ver. ${modalData.stats.lastAppearance}` },
                                            { l: "Phase Count", v: modalData.stats.totalAppearances },
                                            { l: "Drought", v: `${modalData.stats.currentDrought} P`, h: true }
                                        ].map(s => (
                                            <div key={s.l} className="bg-slate-950/60 p-4 rounded-xl border border-white/[0.03]">
                                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5">{s.l}</div>
                                                <div className={`text-xs font-black ${s.h ? 'text-purple-400' : 'text-slate-200'}`}>{s.v}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BannerTracker;
