const fs = require('fs');
const file = 'src/pages/PlaygroundRacesPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add GSAP import
if (!content.includes('import gsap from')) {
  content = content.replace("import React, {", "import React, {\n  useLayoutEffect,\n");
  content = content.replace("import { useLocation", "import gsap from 'gsap';\nimport { useLocation");
}

// 2. Replace LobbyRelicPreview
const relicPreviewRegex = /function LobbyRelicPreview\(\{[^]*?\}[^]*?return \([^]*?\);\n\}/m;
content = content.replace(relicPreviewRegex, `function LobbyRelicPreview({ title, relic }) {
  if (!relic) return null;
  const lines = [...(Array.isArray(relic.lines) ? relic.lines : []), relic.fourthLine].filter(Boolean);

  return (
    <div className="group relative overflow-hidden rounded-[1.5rem] border backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]" style={{ borderColor: 'var(--theme-border-soft)', background: 'var(--theme-surface-2)' }}>
      <div className="absolute -inset-1 opacity-0 transition-opacity duration-500 group-hover:opacity-30 blur-xl pointer-events-none" style={{ background: 'var(--theme-accent)' }} />
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'var(--theme-accent-strong)' }} />
      
      <div className="relative z-10 p-5 flex flex-col h-full">
        <div className="mb-4 flex items-start gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--theme-border-strong)', background: 'var(--theme-surface-3)' }}>
             {relic.setImage ? (
               <img src={relic.setImage} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-125" alt="" onError={e => e.currentTarget.style.display='none'} />
             ) : (
               <div className="h-full w-full flex items-center justify-center opacity-50" />
             )}
          </div>
          <div className="min-w-0">
            <div className="font-sans text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'var(--theme-accent)' }}>{title}</div>
            <div className="mt-1 truncate font-sans text-lg font-bold tracking-tight text-white drop-shadow-md">{relic.pieceLabel || 'Target Config'}</div>
            <div className="truncate text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>{relic.setNameHint || relic.setName || 'Any set'}</div>
          </div>
        </div>

        <div className="mb-4 rounded-xl border p-3 shadow-inner" style={{ borderColor: 'var(--theme-border-soft)', background: 'var(--theme-surface-overlay)' }}>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-soft)' }}>Main Stat Focus</div>
          <div className="mt-1 font-mono text-xl font-black text-white">{relic.mainStat || 'N/A'}</div>
        </div>

        <div className="mt-auto space-y-1">
          {lines.map((stat, i) => (
            <div key={i} className="flex justify-between items-center rounded-lg px-2 py-1.5 transition-colors group-hover:bg-white/5">
               <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--theme-accent-strong)' }}>L{i+1}</span>
               <span className="text-xs font-semibold tracking-wide text-white drop-shadow-sm">{stat}</span>
            </div>
          ))}
          {lines.length === 0 && <div className="text-xs italic text-center" style={{ color: 'var(--theme-text-soft)' }}>Room pool rates apply</div>}
        </div>
      </div>
    </div>
  );
}`);

// 3. Replace the main `return (` block
const mainReturnRegex = /  return \([^]*?\n\}/m;

const newReturnBlock = `  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gsap-fade-slide',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
      );
      gsap.fromTo(
        '.gsap-glow',
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 2, ease: 'expo.out' }
      );
      gsap.fromTo(
        '.gsap-card',
        { y: 60, opacity: 0, rotationX: 10 },
        { y: 0, opacity: 1, rotationX: 0, duration: 1, stagger: 0.15, ease: 'power3.out', delay: 0.1 }
      );
    });
    return () => ctx.revert();
  }, [room?.status]);

  return (
    <div className={\`playground-theme-shell min-h-screen relative overflow-hidden px-4 md:px-8 pb-12 pt-6 \${themeConfig.rootClassName || ''} [&_button:not(:disabled)]:cursor-pointer\`} style={{ background: 'var(--theme-body-bg)', color: 'var(--theme-text-primary)' }}>
      {/* Background Atmosphere */}
      <div className="gsap-glow absolute -left-[20%] -top-[10%] h-[60vw] w-[60vw] rounded-full blur-[160px] opacity-[0.15] pointer-events-none" style={{ background: 'var(--theme-accent)' }} />
      <div className="gsap-glow absolute -right-[20%] top-[40%] h-[50vw] w-[50vw] rounded-full blur-[140px] opacity-10 pointer-events-none" style={{ background: 'var(--theme-accent-strong)' }} />

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 relative z-10">
        
        {/* Header */}
        <header className="gsap-fade-slide relative overflow-hidden rounded-[2.5rem] border p-8 md:p-12 shadow-2xl" style={{ borderColor: 'var(--theme-border-soft)', background: 'var(--theme-surface-1)' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l opacity-30 pointer-events-none blur-3xl mix-blend-screen" style={{ backgroundImage: 'linear-gradient(to left, var(--theme-accent-strong), transparent)' }} />
          
          <div className="relative z-10 flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <button
                type="button"
                onClick={() => navigate('/playground')}
                className="group mb-8 inline-flex items-center gap-3 rounded-full border px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition-colors hover:bg-white/10"
                style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Return to Matrix
              </button>
              
              <h1 className="text-5xl font-black uppercase tracking-tight md:text-7xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{ color: 'var(--theme-accent-contrast)' }}>
                PvP Score Duel
              </h1>
              <p className="mt-6 text-base font-medium leading-relaxed max-w-2xl" style={{ color: 'var(--theme-text-muted)' }}>
                Instantiate a secure tactical room. Both duelists connect to the exact same contract seed and relic payload. Optimize your rolls. The superior build takes the victory.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 shrink-0 mt-6 lg:mt-0">
              {[{ label: 'Seed Protocol', val: 'Shared' }, { label: 'Roll Attempts', val: '3 Per Side' }, { label: 'Victory Logic', val: 'Best Submission' }].map((stat, idx) => (
                <div key={idx} className="rounded-2xl border p-5 backdrop-blur-md" style={{ borderColor: 'var(--theme-border-soft)', background: 'var(--theme-surface-overlay)' }}>
                   <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80" style={{ color: 'var(--theme-accent)' }}>{stat.label}</div>
                   <div className="mt-2 text-sm font-bold text-white tracking-wide">{stat.val}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {error && (
          <div className="gsap-fade-slide rounded-2xl border border-red-500/30 bg-red-950/40 p-5 text-sm font-medium text-red-200">
            {error}
          </div>
        )}

        {!room ? (
          <section className="grid gap-8 xl:grid-cols-[1.5fr_1fr] items-start">
             {/* Host Panel */}
             <div className="gsap-card relative flex flex-col rounded-[2rem] border overflow-hidden p-8 lg:p-12 backdrop-blur-xl shadow-2xl" style={{ borderColor: 'var(--theme-border-strong)', background: 'var(--theme-surface-1)' }}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r blur-[2px]" style={{ backgroundImage: 'linear-gradient(to right, var(--theme-accent-strong), var(--theme-accent), transparent)' }} />
                
                <div className="mb-10 flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] shadow-inner" style={{ background: 'var(--theme-surface-3)', borderColor: 'var(--theme-border-soft)' }}>
                    <Swords className="h-7 w-7 drop-shadow-[0_0_8px_var(--theme-accent)]" style={{ color: 'var(--theme-accent)' }} />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white">Create Room</h2>
                </div>

                <div className="grid gap-10 lg:grid-cols-[200px_1fr]">
                  {/* Tier Col */}
                  <div>
                    <label className="mb-4 block text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>Difficulty Tier</label>
                    <div className="flex flex-col gap-3">
                      {TIERS.map((tier) => (
                        <button
                          key={tier}
                          onClick={() => setSelectedTier(tier)}
                          className={\`relative overflow-hidden rounded-xl border px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-[1.02] \${selectedTier === tier ? 'shadow-lg' : 'opacity-70 hover:opacity-100'}\`}
                          style={{
                            borderColor: selectedTier === tier ? 'var(--theme-border-strong)' : 'var(--theme-border-soft)',
                            background: selectedTier === tier ? 'var(--theme-surface-3)' : 'var(--theme-surface-overlay)',
                            color: selectedTier === tier ? 'var(--theme-accent-contrast)' : 'var(--theme-text-muted)'
                          }}
                        >
                          {selectedTier === tier && <div className="absolute inset-0 bg-gradient-to-r opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, var(--theme-accent-strong), transparent)' }} />}
                          <span className="relative z-10">{formatTierLabel(tier)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Overrides Col */}
                  <div className="flex flex-col gap-10">
                     <div>
                       <div className="mb-4 flex items-center justify-between">
                         <label className="block text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>Target Set</label>
                         <button onClick={() => setSelectedSetName('')} className="rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase transition-all hover:bg-white/5" style={{ borderColor: selectedSetName ? 'var(--theme-border-soft)' : 'var(--theme-border-strong)', color: selectedSetName ? 'var(--theme-text-muted)' : 'var(--theme-accent)' }}>Random Set</button>
                       </div>
                       <div className="max-h-[300px] overflow-y-auto rounded-2xl border p-2 custom-scrollbar shadow-inner" style={{ borderColor: 'var(--theme-border-soft)', background: 'var(--theme-surface-overlay)' }}>
                         {relicSetOptions.map((entry) => (
                           <button
                             key={entry.name}
                             onClick={() => setSelectedSetName(entry.name)}
                             className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors hover:bg-white/5"
                             style={{ background: selectedSetName === entry.name ? 'var(--theme-surface-3)' : 'transparent' }}
                           >
                             {entry.image ? <img src={entry.image} className="h-10 w-10 rounded-lg object-cover shadow border border-white/5" alt="" /> : <div className="h-10 w-10 rounded-lg bg-white/5" />}
                             <div className="min-w-0 flex-1">
                               <div className="truncate text-sm font-bold tracking-wide text-white">{entry.name}</div>
                               <div className="mt-1 text-[10px] uppercase tracking-widest" style={{ color: selectedSetName === entry.name ? 'var(--theme-accent)' : 'var(--theme-text-soft)' }}>{selectedSetName === entry.name ? 'Locked In' : 'Select Set'}</div>
                             </div>
                           </button>
                         ))}
                       </div>
                     </div>

                     <div>
                       <label className="mb-4 block text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>Substat Target Range</label>
                       <div className="flex flex-wrap gap-2.5">
                         {TARGET_SUB_OPTIONS.map((stat) => (
                           <button
                             key={stat}
                             onClick={() => toggleTargetSub(stat)}
                             className={\`relative overflow-hidden rounded-xl border px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 \${selectedTargetSubs.includes(stat) ? 'shadow-md shadow-black/40' : ''}\`}
                             style={{
                               borderColor: selectedTargetSubs.includes(stat) ? 'var(--theme-border-strong)' : 'var(--theme-border-soft)',
                               background: selectedTargetSubs.includes(stat) ? 'var(--theme-surface-3)' : 'var(--theme-surface-overlay)',
                               color: selectedTargetSubs.includes(stat) ? 'var(--theme-accent-contrast)' : 'var(--theme-text-muted)'
                             }}
                           >
                              {selectedTargetSubs.includes(stat) && <div className="absolute inset-x-0 bottom-0 h-[2px] blur-[1px]" style={{ background: 'var(--theme-accent-strong)' }} />}
                              {stat}
                           </button>
                         ))}
                       </div>
                     </div>
                  </div>
                </div>

                <div className="mt-10 pt-10 border-t flex justify-end" style={{ borderColor: 'var(--theme-border-soft)' }}>
                  <button
                    onClick={handleCreateRoom}
                    disabled={busyAction !== ''}
                    className="group relative flex w-full sm:w-auto overflow-hidden items-center justify-center gap-3 rounded-2xl px-12 py-5 text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.03]"
                    style={{ background: 'var(--theme-surface-overlay)', color: 'var(--theme-accent-contrast)', border: '1px solid var(--theme-border-strong)', boxShadow: 'var(--theme-shadow-accent)' }}
                  >
                    <div className="absolute inset-0 opacity-80 pointer-events-none" style={{ background: 'linear-gradient(135deg, var(--theme-accent-strong), var(--theme-accent))' }} />
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 mix-blend-screen pointer-events-none" style={{ background: 'linear-gradient(135deg, white, transparent)' }} />
                    <span className="relative z-10 flex items-center gap-3">
                      {busyAction === 'create' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />}
                      Initialize Encounter
                    </span>
                  </button>
                </div>
             </div>

             {/* Join Panel */}
             <div className="gsap-card relative flex flex-col rounded-[2rem] border overflow-hidden p-8 lg:p-12 backdrop-blur-xl shadow-xl" style={{ borderColor: 'var(--theme-border-soft)', background: 'var(--theme-surface-2)' }}>
                <div className="mb-10 flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] shadow-inner bg-black/40 border border-white/5">
                    <DoorOpen className="h-7 w-7" style={{ color: 'var(--theme-text-primary)' }} />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white">Join</h2>
                </div>

                <div className="flex flex-col gap-6">
                   <div className="relative">
                     <div className="absolute inset-0 rounded-2xl blur-lg pointer-events-none opacity-20" style={{ background: 'var(--theme-accent)' }} />
                     <input
                       value={joinCode}
                       onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                       placeholder="ENTER CODE"
                       className="relative w-full rounded-2xl border px-6 py-6 text-center font-mono text-2xl font-black uppercase tracking-[0.3em] outline-none transition-all placeholder:text-white/10 focus:scale-[1.02]"
                       style={{ borderColor: 'var(--theme-border-strong)', background: 'var(--theme-surface-overlay)', color: 'var(--theme-accent-contrast)', boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.5)' }}
                     />
                   </div>
                   <button
                     onClick={handleJoinRoom}
                     disabled={busyAction !== ''}
                     className="group flex w-full items-center justify-center gap-3 rounded-2xl border px-8 py-5 text-sm font-black uppercase tracking-widest transition-all hover:bg-white/5"
                     style={{ borderColor: 'var(--theme-border-strong)', color: 'var(--theme-text-primary)' }}
                   >
                     {busyAction === 'join' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
                     Connect
                   </button>
                </div>

                <div className="mt-12 rounded-2xl p-6" style={{ background: 'var(--theme-surface-overlay)', borderColor: 'var(--theme-border-soft)', border: '1px solid var(--theme-border-soft)' }}>
                  <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: 'var(--theme-accent-strong)' }}>Active Protocol Rules</h3>
                  <div className="space-y-4 text-sm font-medium leading-relaxed" style={{ color: 'var(--theme-text-muted)' }}>
                    <p className="flex items-center gap-3"><ChevronRight className="h-4 w-4" style={{ color: 'var(--theme-accent)' }} /> The host establishes the target configuration payload.</p>
                    <p className="flex items-center gap-3"><ChevronRight className="h-4 w-4" style={{ color: 'var(--theme-accent)' }} /> Both clients receive the precise identical starting setup.</p>
                    <p className="flex items-center gap-3"><ChevronRight className="h-4 w-4" style={{ color: 'var(--theme-accent)' }} /> Submit the highest theoretical scored build to claim victory.</p>
                  </div>
                </div>
             </div>
          </section>
        ) : (
          <section className="gsap-card relative overflow-hidden rounded-[2.5rem] border backdrop-blur-[32px] shadow-2xl flex flex-col" style={{ borderColor: 'var(--theme-border-strong)', background: 'var(--theme-surface-1)' }}>
            
            {/* Active Encounter Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b px-8 py-6 relative" style={{ borderColor: 'var(--theme-border-soft)', background: 'var(--theme-surface-overlay)' }}>
               <div className="absolute top-0 left-0 w-[50%] h-1" style={{ background: 'linear-gradient(to right, var(--theme-accent-strong), transparent)' }} />
               
               <div className="flex items-center gap-6">
                 <div className="flex h-4 w-4 items-center justify-center">
                   <div className="absolute h-5 w-5 animate-ping rounded-full opacity-60" style={{ background: 'var(--theme-accent-strong)' }} />
                   <div className="relative h-2.5 w-2.5 rounded-full shadow-[0_0_8px_var(--theme-accent)]" style={{ background: 'var(--theme-accent)' }} />
                 </div>
                 <div className="flex flex-col">
                   <h2 className="font-mono text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: 'var(--theme-text-muted)' }}>Status / Active Board</h2>
                 </div>
                 <div className="font-mono text-3xl font-black uppercase tracking-widest drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]" style={{ color: 'var(--theme-accent-contrast)' }}>{room.code}</div>
                 
                 <button onClick={handleCopyCode} className="ml-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all hover:bg-white/10" style={{ borderColor: 'var(--theme-border-strong)', color: 'var(--theme-accent)' }}>
                   {copied ? 'Copied' : 'Copy'}
                 </button>
               </div>

               <div className="mt-8 flex flex-wrap gap-3 lg:mt-0">
                 {room.status === 'lobby' && isHost && (
                   <>
                     {canDevFill && <button onClick={handleDevFill} disabled={busyAction !== ''} className="rounded-xl border px-5 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>Insert Oracle Bot</button>}
                     {canDevFill && <button onClick={handleDevFillFair} disabled={busyAction !== ''} className="rounded-xl border px-5 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>Insert Fair Bot</button>}
                     <button onClick={handleRerollRoom} disabled={busyAction !== ''} className="flex items-center gap-2 rounded-xl border px-5 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--theme-border-strong)', color: 'var(--theme-accent)' }}><RefreshCw className="h-4 w-4" /> Reroll Payload</button>
                     <button onClick={handleStartRoom} disabled={busyAction !== '' || !room.guest?.userId} className="relative group flex items-center gap-2 rounded-xl px-8 py-3.5 text-[11px] font-black uppercase tracking-widest text-[#0a0a0a] shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:scale-105 disabled:opacity-50 overflow-hidden" style={{ background: 'var(--theme-surface-overlay)', border: '1px solid var(--theme-border-strong)' }}>
                       <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, var(--theme-accent-strong), var(--theme-accent))' }} />
                       <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity mix-blend-screen pointer-events-none" style={{ background: 'linear-gradient(135deg, white, transparent)' }} />
                       <span className="relative z-10 flex items-center gap-2" style={{ color: 'var(--theme-accent-contrast)' }}><Play className="h-4 w-4" /> Finalize & Start</span>
                     </button>
                   </>
                 )}
                 {(room.status === 'countdown' || room.status === 'active' || room.status === 'finished') && (
                   <button onClick={openBoard} className="flex items-center gap-4 rounded-xl px-10 py-5 text-[13px] font-black uppercase tracking-[0.25em] text-[#0a0a0a] shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:scale-[1.03] transition-all" style={{ background: 'linear-gradient(135deg, var(--theme-accent-strong), var(--theme-accent))', color: 'var(--theme-accent-contrast)' }}>
                     Enter Board <ChevronRight className="h-6 w-6" />
                   </button>
                 )}
               </div>
            </div>

            <div className="grid lg:grid-cols-[1.3fr_1fr]">
              
              {/* VS Panel */}
              <div className="flex flex-col relative overflow-hidden bg-black/40 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--theme-border-soft)' }}>
                <div className="absolute right-0 top-0 h-full w-[2px] bg-gradient-to-b opacity-50" style={{ backgroundImage: 'linear-gradient(to bottom, transparent, var(--theme-accent), transparent)' }} />
                
                <div className="flex-1 flex flex-col justify-center px-8 py-20 relative">
                  
                  {/* Host UI */}
                  <div className="relative mb-20 flex items-center justify-between p-6 rounded-[2rem] border bg-black/40 backdrop-blur-md shadow-2xl" style={{ borderColor: 'var(--theme-border-strong)' }}>
                    <div className="absolute -left-3 h-20 w-1.5 rounded-full" style={{ background: 'var(--theme-accent)', boxShadow: '0 0 20px var(--theme-accent)' }} />
                    <div className="flex items-center gap-6">
                      <div className="h-16 w-16 rounded-full border bg-black/60 flex items-center justify-center font-black text-2xl" style={{ borderColor: 'var(--theme-border-strong)', color: 'var(--theme-accent)' }}>
                        {room.host?.name?.charAt(0) || 'H'}
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-1" style={{ color: 'var(--theme-text-muted)' }}>Creator</div>
                        <div className="text-3xl font-black tracking-tight text-white">{room.host?.name || 'Host'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="inline-block rounded-xl px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.25em]" style={{ background: 'var(--theme-surface-overlay)', color: 'var(--theme-accent)', border: '1px solid var(--theme-border-soft)' }}>{room.host?.state?.status || 'Active'}</span>
                    </div>
                  </div>

                  {/* Absolute Center Divider */}
                  <div className="absolute left-0 right-0 top-1/2 flex -translate-y-1/2 items-center justify-center z-20">
                    <div className="h-[2px] w-full absolute bg-gradient-to-r drop-shadow-lg" style={{ backgroundImage: 'linear-gradient(to right, transparent, var(--theme-border-strong), transparent)' }} />
                    <div className="relative z-10 rounded-full border px-8 py-3 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl" style={{ borderColor: 'var(--theme-border-strong)', background: 'var(--theme-surface-1)' }}>
                       <span className="font-mono text-sm font-black italic tracking-[0.5em]" style={{ color: 'var(--theme-accent-contrast)' }}>V E R S U S</span>
                    </div>
                  </div>

                  {/* Guest UI */}
                  <div className={\`relative mt-20 flex items-center justify-between p-6 rounded-[2rem] border backdrop-blur-md shadow-2xl transition-colors \${!room.guest?.userId ? 'bg-black/20 opacity-70' : 'bg-black/40'}\`} style={{ borderColor: room.guest?.userId ? '#ef4444' : 'var(--theme-border-soft)' }}>
                    {room.guest?.userId && <div className="absolute -left-3 h-20 w-1.5 rounded-full drop-shadow-[0_0_20px_#ef4444]" style={{ background: '#ef4444' }} />}
                    <div className="flex items-center gap-6">
                      <div className="h-16 w-16 rounded-full border bg-black/60 flex items-center justify-center font-black text-2xl" style={{ borderColor: room.guest?.userId ? '#ef4444' : 'var(--theme-border-soft)', color: room.guest?.userId ? '#ef4444' : 'var(--theme-text-muted)' }}>
                        {room.guest?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-1" style={{ color: 'var(--theme-text-muted)' }}>Challenger</div>
                        <div className={\`text-3xl font-black tracking-tight \${room.guest?.userId ? 'text-white' : 'text-white/30'}\`}>{room.guest?.name || 'Awaiting Connect...'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="inline-block rounded-xl px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.25em]" style={{ background: 'var(--theme-surface-overlay)', color: room.guest?.userId ? '#ef4444' : 'var(--theme-text-muted)', border: '1px solid var(--theme-border-soft)' }}>{room.guest?.userId ? (room.guest?.state?.status || 'Active') : 'Open'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Params */}
              <div className="p-8 md:p-12 lg:p-16 relative">
                 <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-black/40 mix-blend-multiply" />
                 
                 <div className="relative z-10">
                   <div className="mb-6 inline-block rounded-full border px-5 py-2 text-[10px] font-black uppercase tracking-[0.3em] shadow-inner" style={{ borderColor: 'var(--theme-border-strong)', color: 'var(--theme-accent)', background: 'var(--theme-surface-overlay)' }}>Mission Payload</div>
                   <h3 className="text-3xl font-black uppercase tracking-tight text-white">{room.scenario?.title || 'System Loading'}</h3>
                   <p className="mt-4 text-[15px] font-medium leading-relaxed max-w-lg" style={{ color: 'var(--theme-text-muted)' }}>{room.scenario?.goal || 'Waiting for configuration payload.'}</p>
                   
                   <div className="mt-8 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest">
                      <span className="rounded-xl border px-4 py-3 shadow-inner" style={{ borderColor: 'var(--theme-border-soft)', background: 'var(--theme-surface-overlay)', color: 'var(--theme-accent)' }}><span className="text-white/30 mr-2">SET</span>{formatSetShortName(room.scenario?.targetRelic?.setNameHint || selectedSetName)}</span>
                      <span className="rounded-xl border px-4 py-3 shadow-inner" style={{ borderColor: 'var(--theme-border-soft)', background: 'var(--theme-surface-overlay)', color: 'var(--theme-accent)' }}><span className="text-white/30 mr-2">SEED</span>{room.seedLabel || room.scenario?.seedLabel}</span>
                      <span className="rounded-xl border px-4 py-3 shadow-inner" style={{ borderColor: 'var(--theme-border-soft)', background: 'var(--theme-surface-overlay)', color: 'white' }}><span className="text-white/30 mr-2">TIER</span>{formatTierLabel(room.tier)}</span>
                   </div>

                   <div className="mt-12 space-y-8">
                      <LobbyRelicPreview title="Target Override" relic={room.scenario?.targetRelic} />
                      <LobbyRelicPreview title="Setup Payload" relic={room.scenario?.builderRelic} />
                      <LobbyRelicPreview title="Force Relic" relic={room.scenario?.forceRelic} />
                   </div>
                 </div>
              </div>
            </div>

            {room.status === 'finished' && (
              <div className="border-t p-8 lg:p-12 backdrop-blur-2xl" style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)' }}>
                <div className="flex items-center gap-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                    <Trophy className="h-8 w-8 text-emerald-400 drop-shadow-md" />
                  </div>
                  <div>
                    <div className="font-mono text-[11px] font-black uppercase tracking-[0.4em] text-emerald-400/80 mb-2 drop-shadow">Match Concluded</div>
                    <div className="text-3xl lg:text-4xl font-black uppercase tracking-wider text-emerald-50 drop-shadow-xl">
                      Victory assigned to <span className="text-emerald-400 ml-2 border-b-2 border-emerald-400/50 pb-1">{room.winnerUserId === room.host?.userId ? room.host?.name : room.winnerUserId === room.guest?.userId ? room.guest?.name : 'Pending'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}`;

content = content.replace(mainReturnRegex, newReturnBlock);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully completed Rewrite PVP Layout script.');
