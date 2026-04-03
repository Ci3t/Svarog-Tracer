import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ArrowLeft,
  ArrowUpRight,
  BrainCircuit,
  Dice5,
  Radar,
  ShieldCheck,
  Swords,
  Target,
  Wrench,
  Zap,
  Sparkles,
  Search,
  Lock,
} from 'lucide-react';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import { useAuth } from '../hooks/useAuth';

const MODE_THEMES = {
  free: {
    color: 'cyan',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/10',
    bg: 'bg-cyan-500/5',
    glow: 'from-cyan-500/20',
    icon: Dice5,
    tag: 'Sandbox Mode',
    label: 'Free Experiment',
  },
  pvp: {
    color: 'violet',
    accent: 'text-violet-400',
    border: 'border-violet-500/10',
    bg: 'bg-violet-500/5',
    glow: 'from-violet-500/20',
    icon: Swords,
    tag: 'Competitive',
    label: 'Relic Races',
  },
  challenge: {
    color: 'amber',
    accent: 'text-amber-400',
    border: 'border-amber-500/10',
    bg: 'bg-amber-500/5',
    glow: 'from-amber-500/20',
    icon: Target,
    tag: 'Contracts',
    label: 'Challenge Ladder',
  },
  drills: {
    color: 'emerald',
    accent: 'text-emerald-400',
    border: 'border-emerald-500/10',
    bg: 'bg-emerald-500/5',
    glow: 'from-emerald-500/20',
    icon: BrainCircuit,
    tag: 'Training',
    label: 'Beginner Drills',
  },
  patterns: {
    color: 'fuchsia',
    accent: 'text-fuchsia-400',
    border: 'border-fuchsia-500/10',
    bg: 'bg-fuchsia-500/5',
    glow: 'from-fuchsia-500/20',
    icon: Radar,
    tag: 'Analysis',
    label: 'Pattern Lab',
  },
};

function TrainingCard({ modeId, modeData, onOpen }) {
  const theme = MODE_THEMES[modeId] || MODE_THEMES.free;
  const { summary, detail } = modeData;
  const Icon = theme.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group theme-glass-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 p-6 text-left transition-all duration-300 hover:border-white/16 hover:bg-white/[0.04] cursor-pointer"
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${theme.bg.replace('/5', '/60')} opacity-80`} />
      
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <div className="theme-subpanel flex h-12 w-12 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] transition-all duration-300 group-hover:border-white/16">
                   <Icon className={`h-6 w-6 ${theme.accent}`} />
                </div>
                <div>
                   <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{theme.tag}</div>
                   <div className="text-xl font-bold tracking-tight text-white">{theme.label}</div>
                </div>
             </div>
          </div>
          <ArrowUpRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-white" />
        </div>

        <div className="mt-8 flex-1">
          <p className="text-sm leading-6 text-slate-400 transition-colors group-hover:text-slate-200">{summary}</p>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
             <Search className="h-3 w-3" />
             {detail}
          </div>
          <div className="h-1.5 w-1.5 rounded-full bg-white/10 group-hover:bg-white/40" />
        </div>
      </div>
    </button>
  );
}

export default function PlaygroundPage({ sessionTheme = 'modern' }) {
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const navigate = useNavigate();
  const { isAuthenticated, roleMode } = useAuth();
  const containerRef = useRef(null);
  const claraRef = useRef(null);
  const showAdminBuilder = isAuthenticated && roleMode === 'admin';

  useEffect(() => {
    if (!containerRef.current) return;
    const q = gsap.utils.selector(containerRef.current);
    
    // Staggered entrance
    gsap.fromTo(
      q('.gsap-clara-in'),
      { autoAlpha: 0, scale: 0.95, x: -40 },
      { autoAlpha: 1, scale: 1, x: 0, duration: 1.2, ease: 'expo.out' }
    );

    gsap.fromTo(
      q('.gsap-grid-in'),
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, delay: 0.4, ease: 'power3.out' }
    );

    // Clara Idle "Hover"
    if (claraRef.current) {
      gsap.to(claraRef.current, {
        y: -10,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`playground-theme-shell relative min-h-screen overflow-x-hidden bg-transparent px-4 py-8 md:px-12 ${themeConfig.rootClassName || ''}`}
    >
      <div className="relative z-10 mx-auto w-full max-w-[1700px]">
        <header className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between border-b border-white/5 pb-10">
          <div className="gsap-clara-in flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="theme-subpanel flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-slate-500 transition-all hover:border-white/16 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
               <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black uppercase tracking-tighter text-white md:text-5xl">Clara's <span className="text-indigo-400">Hub</span></h1>
                  <div className="hidden rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-slate-300 lg:block">
                     Protocol: Active
                  </div>
               </div>
               <div className="mt-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Your Guided Practice Workspace
               </div>
            </div>
          </div>

          <div className="gsap-clara-in flex items-center gap-4">
             <div className="theme-subpanel rounded-2xl border border-white/8 p-4 lg:px-6">
                <div className="flex items-center gap-3">
                   <ShieldCheck className="h-5 w-5 text-emerald-400" />
                   <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">System Integrity</div>
                      <div className="text-xs font-bold text-slate-300">Predictor Stream Stable</div>
                   </div>
                </div>
             </div>
          </div>
        </header>

        <div className="mt-12 flex flex-col gap-12 lg:grid lg:grid-cols-[450px_1fr]">
           {/* Clara Character Section */}
           <aside className="gsap-clara-in relative">
              <div className="sticky top-12 flex flex-col items-center lg:items-start">
                 <div className="relative group cursor-pointer" onClick={() => navigate('/playground/free')}>
                    <img
                      ref={claraRef}
                      src="/clara-playground.png"
                      alt="Clara Assistant"
                      className="relative z-10 mx-auto h-[450px] w-auto object-contain transition-transform duration-700 hover:scale-[1.03]"
                    />
                    <div className="theme-glass-card absolute -bottom-4 right-0 z-20 rounded-2xl border border-white/8 p-4 backdrop-blur-xl transition-transform group-hover:translate-x-2">
                       <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Clara's Advice</div>
                       <p className="text-xs font-medium text-slate-300 italic">"Don't worry, Trainee! I'll help you read the board cleanly."</p>
                    </div>
                 </div>

                 <div className="mt-12 w-full space-y-4">
                    <div className="theme-subpanel rounded-2xl border border-white/8 p-5">
                       <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4 flex items-center justify-between">
                          Quick Mission Summary
                          <Lock className="h-3 w-3" />
                       </div>
                       <div className="space-y-3">
                          <div className="flex items-center justify-between">
                             <span className="text-xs text-slate-400">Total Solves</span>
                             <span className="text-xs font-mono text-white">4,291</span>
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-xs text-slate-400">Hub Reputation</span>
                             <span className="text-xs font-mono text-amber-400 italic">Elite Researcher</span>
                          </div>
                       </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => navigate('/playground/free')}
                      className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-5 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-white/[0.1] active:scale-95 cursor-pointer"
                    >
                      Resume Learning
                      <ArrowUpRight className="h-5 w-5" />
                    </button>
                 </div>
              </div>
           </aside>

           {/* Main Training Grid */}
           <main className="space-y-10">
              <div className="gsap-grid-in flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight text-white">Select Protocol</h2>
                 <div className="h-px flex-1 mx-6 bg-white/5" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                 {[
                   { id: 'free', summary: 'The ultimate sandbox for manual manipulation, setup line rehearsals, and pure board logic.', detail: 'MANUAL REELS · LOOP STUDY' },
                   { id: 'pvp', summary: 'Test your reads under room-based pressure with shared contracts and bot learning.', detail: 'ACTIVE ROOMS · VERSUS' },
                   { id: 'challenge', summary: 'Climb the proficiency ladder with structured contracts and hard win-gates.', detail: 'CONTRACTS · PROFICIENCY' },
                   { id: 'drills', summary: 'High-speed reps for board vocabulary, noise reads, and common recognition.', detail: 'SPEED · VOCABULARY' },
                   { id: 'patterns', summary: 'Import real session logs to step through board history and inspect Svarog eyes.', detail: 'RESEARCH · HISTORICAL DATA' },
                 ].map((mode) => (
                   <div key={mode.id} className="gsap-grid-in h-full">
                      <TrainingCard 
                        modeId={mode.id} 
                        modeData={mode} 
                        onOpen={() => navigate(MODE_THEMES[mode.id]?.route || `/playground/${mode.id === 'pvp' ? 'races' : mode.id}`)}
                      />
                   </div>
                 ))}
              </div>

              {showAdminBuilder && (
                <div className="gsap-grid-in theme-glass-card group relative overflow-hidden rounded-2xl border border-white/8 p-8 transition-all hover:bg-white/[0.04] cursor-pointer" onClick={() => navigate('/playground/challenge/admin')}>
                   <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                         <div className="theme-subpanel flex h-12 w-12 items-center justify-center rounded-xl border border-white/8 text-amber-400">
                            <Wrench className="h-6 w-6" />
                         </div>
                         <div>
                            <div className="text-lg font-bold text-white uppercase">Admin Protocol</div>
                            <p className="text-sm text-slate-400">Enter the restricted directive workshop.</p>
                         </div>
                      </div>
                      <button className="rounded-xl border border-amber-500/30 px-6 py-3 text-xs font-black uppercase tracking-widest text-amber-400 transition-all hover:bg-amber-500 hover:text-black">
                         Open Dashboard
                      </button>
                   </div>
                </div>
              )}
           </main>
        </div>

        <footer className="gsap-grid-in mb-16 mt-20 flex flex-col gap-8 border-t border-white/5 pt-10 lg:flex-row lg:items-center lg:justify-between">
           <div className="max-w-2xl">
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mb-2">Clara Hub Protocol</div>
              <p className="text-[11px] font-medium leading-7 text-slate-500">
                Data generated here is synchronized with the live predictor stack. 
                Manual and automated drills contribute to the global board-reading baseline. 
                <span className="text-indigo-400 font-bold ml-1 cursor-pointer hover:underline">Read Privacy Directive</span>
              </p>
           </div>
           
           <div className="flex flex-wrap items-center gap-6">
              <div className="theme-subpanel rounded-2xl border border-white/8 p-4 px-6">
                 <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">Hub Status</div>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    v2.5.0-HUB-STABLE
                 </div>
              </div>
           </div>
        </footer>
      </div>
    </div>
  );
}
