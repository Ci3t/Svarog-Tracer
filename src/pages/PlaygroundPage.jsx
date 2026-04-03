import React, { useEffect, useRef, useState } from 'react';
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

const CLARA_TIPS = [
  'Free Mode is the cleanest place to test line routes without pressure.',
  'Challenge Mode is where you turn clean reads into contract clears.',
  'Drills are for speed. Learn the board language there first.',
  'Pattern Lab is for replaying sessions and understanding why a roll happened.',
  'Relic Races is where the same contract becomes a real duel.',
];

const CLARA_IDLE_LINES = {
  en: [
    {
      audio: '/VO_Archive_Clara_2_EN_KeepUpthework.ogg',
      text: "Let's keep up the good work today!",
    },
    {
      audio: '/VO_Archive_Clara_EN_Database.ogg',
      text: "Mr. Svarog has everything in his database.",
    },
    {
      audio: '/VO_Clara_EN_Safehere.ogg',
      text: "Don't worry, Mr. Svarog. We'll be safe here.",
    },
    {
      audio: '/VO_Clara_IHOPE DIDOKAY.ogg',
      text: 'I hope I did okay...',
    },
  ],
  jp: [
    {
      audio: '/VO_JP_Archive_Clara_2_Keepupthework.ogg',
      text: "I'll try my best today too.",
    },
    {
      audio: '/VO_JP_Archive_Clara_Database.ogg',
      text: "Wow! Svarog's database has everything!",
    },
    {
      audio: '/VO_JP_Clara_helpful.ogg',
      text: 'I hope I was helpful to everyone',
    },
    {
      audio: '/VO_JP_Clara_Successful_ right.ogg',
      text: 'Did Clara... do it right?',
    },
  ],
};

const CLARA_MAD_LINES = {
  en: [
    {
      audio: '/VO_Clara_en_ouch.ogg',
      text: 'ouch...',
    },
    {
      audio: '/VO_Clara_en_notafraid.ogg',
      text: "I-I'm not afraid of you!",
    },
    {
      audio: '/VO_JP_Clara_YAH.ogg',
      text: 'Hyah!',
    },
  ],
  jp: [
    {
      audio: '/VO_JP_Clara_YAH.ogg',
      text: 'Hyah!',
    },
    {
      audio: '/VO_JP_Clara_ouch.ogg',
      text: 'Ouch..',
    },
    {
      audio: '/VO_JP_Clara_notscared.ogg',
      text: "I-I'm not scared!",
    },
    {
      audio: '/VO_JP_Clara_HELPSvarog.ogg',
      text: 'Help me, Svarog!',
    },
  ],
};

function resolveClaraLanguage() {
  if (typeof window === 'undefined') return 'en';
  const candidates = [
    window.localStorage.getItem('voice_language'),
    window.localStorage.getItem('voiceLanguage'),
    window.localStorage.getItem('app_language'),
    window.localStorage.getItem('language'),
    window.localStorage.getItem('locale'),
    navigator.language,
  ].filter(Boolean);

  const joined = candidates.join(' ').toLowerCase();
  return joined.includes('jp') || joined.includes('ja') ? 'jp' : 'en';
}

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
    route: '/playground/free',
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
    route: '/playground/races',
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
    route: '/playground/challenge',
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
    route: '/playground/drills',
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
    route: '/playground/pattern-lab',
  },
};

function TrainingCard({ modeId, modeData, onOpen, className = '' }) {
  const theme = MODE_THEMES[modeId] || MODE_THEMES.free;
  const { summary, detail } = modeData;
  const Icon = theme.icon;
  const accentRailClass = {
    cyan: 'bg-cyan-400/70',
    violet: 'bg-violet-400/70',
    amber: 'bg-amber-400/70',
    emerald: 'bg-emerald-400/70',
    fuchsia: 'bg-fuchsia-400/70',
  }[theme.color] || 'bg-white/40';

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group theme-glass-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 p-6 text-left transition-all duration-300 hover:border-white/16 hover:bg-white/[0.04] cursor-pointer ${className}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${accentRailClass} opacity-80`} />
      
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
  const claraShellRef = useRef(null);
  const claraModelRef = useRef(null);
  const claraAudioRef = useRef(null);
  const singleClickTimeoutRef = useRef(null);
  const claraResetTimeoutRef = useRef(null);
  const claraIdleHistoryRef = useRef({ en: [], jp: [] });
  const claraMadHistoryRef = useRef({ en: [], jp: [] });
  const lastClickAtRef = useRef(0);
  const showAdminBuilder = isAuthenticated && roleMode === 'admin';
  const [claraState, setClaraState] = useState('idle');
  const [claraSpeaking, setClaraSpeaking] = useState(false);
  const [claraBubble, setClaraBubble] = useState('');
  const [claraTipIndex, setClaraTipIndex] = useState(0);
  const [claraLanguage, setClaraLanguage] = useState(() => resolveClaraLanguage());
  const [claraInteractionLocked, setClaraInteractionLocked] = useState(false);

  const scheduleClaraReset = () => {
    if (claraResetTimeoutRef.current) {
      window.clearTimeout(claraResetTimeoutRef.current);
    }
    claraResetTimeoutRef.current = window.setTimeout(() => {
      setClaraSpeaking(false);
      setClaraBubble('');
      setClaraState('idle');
      setClaraInteractionLocked(false);
      if (claraModelRef.current) {
        gsap.set(claraModelRef.current, { x: 0, rotate: 0 });
      }
    }, 2000);
  };

  const handleSetClaraLanguage = (nextLanguage) => {
    setClaraLanguage(nextLanguage);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('voiceLanguage', nextLanguage);
    }
  };

  const playClaraLine = (audioSrc, text, nextState = 'normal') => {
    if (claraResetTimeoutRef.current) {
      window.clearTimeout(claraResetTimeoutRef.current);
    }
    if (claraAudioRef.current) {
      claraAudioRef.current.pause();
      claraAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(audioSrc);
    claraAudioRef.current = audio;
    audio.volume = 0.75;
    setClaraState(nextState === 'mad' ? 'mad' : 'normal');
    setClaraBubble(text);
    setClaraSpeaking(true);
    setClaraInteractionLocked(true);

    if (nextState === 'mad' && claraModelRef.current) {
      gsap.killTweensOf(claraModelRef.current);
      gsap.fromTo(
        claraModelRef.current,
        { x: -6, rotate: -1.5 },
        {
          x: 6,
          rotate: 1.5,
          duration: 0.08,
          repeat: 7,
          yoyo: true,
          ease: 'power1.inOut',
          onComplete: () => {
            gsap.set(claraModelRef.current, { x: 0, rotate: 0 });
            if (claraRef.current) {
              gsap.to(claraRef.current, {
                y: -10,
                duration: 3,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
              });
            }
          },
        },
      );
    }

    const finishSpeaking = () => {
      setClaraSpeaking(false);
      setClaraState(nextState === 'mad' ? 'mad' : 'idle');
      claraAudioRef.current = null;
      scheduleClaraReset();
    };

    audio.addEventListener('ended', finishSpeaking, { once: true });
    audio.addEventListener('error', finishSpeaking, { once: true });
    audio.play().catch(() => {
      window.setTimeout(finishSpeaking, 1800);
    });
  };

  const handleClaraSingleClick = () => {
    const linePool = CLARA_IDLE_LINES[claraLanguage] || CLARA_IDLE_LINES.en;
    const usedForLanguage = claraIdleHistoryRef.current[claraLanguage] || [];
    let availableIndexes = linePool
      .map((_, index) => index)
      .filter((index) => !usedForLanguage.includes(index));

    if (availableIndexes.length === 0) {
      claraIdleHistoryRef.current[claraLanguage] = [];
      availableIndexes = linePool.map((_, index) => index);
    }

    const pickedIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
    claraIdleHistoryRef.current[claraLanguage] = [...(claraIdleHistoryRef.current[claraLanguage] || []), pickedIndex];
    const selected = linePool[pickedIndex];
    playClaraLine(
      selected.audio,
      selected.text,
      'normal',
    );
  };

  const handleClaraAngryClick = () => {
    const linePool = CLARA_MAD_LINES[claraLanguage] || CLARA_MAD_LINES.en;
    const usedForLanguage = claraMadHistoryRef.current[claraLanguage] || [];
    let availableIndexes = linePool
      .map((_, index) => index)
      .filter((index) => !usedForLanguage.includes(index));

    if (availableIndexes.length === 0) {
      claraMadHistoryRef.current[claraLanguage] = [];
      availableIndexes = linePool.map((_, index) => index);
    }

    const pickedIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
    claraMadHistoryRef.current[claraLanguage] = [...(claraMadHistoryRef.current[claraLanguage] || []), pickedIndex];
    const selected = linePool[pickedIndex];
    playClaraLine(selected.audio, selected.text, 'mad');
  };

  const handleClaraClick = () => {
    if (claraInteractionLocked) return;
    const now = Date.now();
    const isRapidClick = now - lastClickAtRef.current < 300;
    lastClickAtRef.current = now;

    if (singleClickTimeoutRef.current) {
      window.clearTimeout(singleClickTimeoutRef.current);
      singleClickTimeoutRef.current = null;
    }

    if (isRapidClick) {
      handleClaraAngryClick();
      return;
    }

    singleClickTimeoutRef.current = window.setTimeout(() => {
      handleClaraSingleClick();
      singleClickTimeoutRef.current = null;
    }, 240);
  };

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

  useEffect(() => {
    return () => {
    if (singleClickTimeoutRef.current) {
      window.clearTimeout(singleClickTimeoutRef.current);
    }
    if (claraResetTimeoutRef.current) {
      window.clearTimeout(claraResetTimeoutRef.current);
    }
    if (claraAudioRef.current) {
      claraAudioRef.current.pause();
      claraAudioRef.current.currentTime = 0;
      }
    };
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
                 <div ref={claraShellRef} className="relative group select-none">
                    <div
                      ref={claraModelRef}
                      className="relative"
                      onClick={handleClaraClick}
                    >
                      <img
                        ref={claraRef}
                        src={
                          claraSpeaking
                            ? claraState === 'mad'
                              ? '/clara-mad-playground-gif.gif'
                              : '/clara-playground-gif.gif'
                            : claraState === 'mad'
                              ? '/clara-playground-mad.png'
                              : '/clara-playground.png'
                        }
                        alt="Clara Assistant"
                        className="relative z-10 mx-auto h-[450px] w-auto cursor-pointer object-contain transition-transform duration-700 hover:scale-[1.03]"
                      />
                    </div>
                    <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-32 w-full bg-gradient-to-b from-transparent via-[rgba(10,12,16,0.2)] to-[rgba(10,12,16,0.94)]" />
                    <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 h-px w-[72%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                    {claraSpeaking && claraBubble ? (
                      <div className="absolute right-[-20px] top-[-10px] z-20 max-w-[280px] transition-transform group-hover:translate-x-2 lg:right-[-36px] lg:top-[-18px]">
                        <div className="relative rounded-[28px] border-[3px] border-sky-400 bg-white px-5 py-4 text-center shadow-[0_12px_35px_rgba(0,0,0,0.28)]">
                          <div className="text-[15px] font-black uppercase leading-tight tracking-tight text-slate-900">
                            {claraBubble}
                          </div>
                          <div className="absolute -bottom-5 left-12 h-0 w-0 border-l-[18px] border-r-[8px] border-t-[26px] border-l-transparent border-r-transparent border-t-sky-400">
                            <div className="absolute left-[-15px] top-[-28px] h-0 w-0 border-l-[15px] border-r-[7px] border-t-[22px] border-l-transparent border-r-transparent border-t-white" />
                          </div>
                        </div>
                      </div>
                    ) : null}
                 </div>

                 <div className="mt-12 w-full space-y-4">
                    <div className="theme-subpanel flex items-center justify-between rounded-2xl border border-white/8 p-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Voice protocol</div>
                        <div className="mt-1 text-xs text-slate-400">Choose Clara's voice language for hub clicks.</div>
                      </div>
                      <div className="inline-flex rounded-lg border border-white/8 bg-white/[0.03] p-1">
                        {['en', 'jp'].map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => handleSetClaraLanguage(lang)}
                            className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                              claraLanguage === lang
                                ? 'bg-white/[0.12] text-white'
                                : 'text-slate-500 hover:text-slate-200'
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>
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

              <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                 {[
                   { id: 'free', gridClass: 'md:col-span-8 md:row-span-2', summary: 'The ultimate sandbox for manual manipulation, setup line rehearsals, and pure board logic.', detail: 'MANUAL REELS · LOOP STUDY' },
                   { id: 'pvp', gridClass: 'md:col-span-4 md:row-span-1', summary: 'Test your reads under room-based pressure with shared contracts and shared board learning.', detail: 'ACTIVE ROOMS · VERSUS' },
                   { id: 'challenge', gridClass: 'md:col-span-4 md:row-span-1', summary: 'Climb the proficiency ladder with structured contracts and hard win-gates.', detail: 'CONTRACTS · PROFICIENCY' },
                   { id: 'drills', gridClass: 'md:col-span-6 md:row-span-1', summary: 'High-speed reps for board vocabulary, noise reads, and common recognition.', detail: 'SPEED · VOCABULARY' },
                   { id: 'patterns', gridClass: 'md:col-span-6 md:row-span-1', summary: 'Import real session logs to step through board history and inspect Svarog eyes.', detail: 'RESEARCH · HISTORICAL DATA' },
                 ].map((mode) => (
                   <TrainingCard 
                      key={mode.id} 
                      modeId={mode.id} 
                      modeData={mode} 
                      className={`gsap-grid-in ${mode.gridClass}`}
                      onOpen={() => navigate(MODE_THEMES[mode.id]?.route || '/playground')}
                   />
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
