import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowRight, BrainCircuit, Dice5, Lock, Radar, Sparkles, Swords, Target, Trophy, ChevronRight } from 'lucide-react';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import { useAuth } from '../hooks/useAuth';

const MODE_CARDS = [
  {
    id: 'free',
    label: 'Free Mode',
    eyebrow: 'Playable Now',
    summary: 'Generate relics, reroll, swap line order, and practice manip without pressure.',
    detail: 'Optimal for building core logic intuition.',
    route: '/playground/free',
    Icon: Dice5,
    themeColor: 'cyan',
    badgeClass: 'border-cyan-400/40 bg-cyan-400/12 text-cyan-200',
    borderClass: 'border-cyan-400/35',
    iconClass: 'text-cyan-200',
    locked: false,
  },
  {
    id: 'challenge',
    label: 'Challenge Mode',
    eyebrow: 'Open Now',
    summary: 'Solve curated relic situations from easy to hard using the real predictor logic.',
    detail: 'Goal cards, cleaner scoring, and layered hints.',
    route: '/playground/challenge',
    Icon: Target,
    themeColor: 'amber',
    badgeClass: 'border-amber-400/40 bg-amber-400/12 text-amber-200',
    borderClass: 'border-amber-400/35',
    iconClass: 'text-amber-200',
    locked: false,
  },
  {
    id: 'drills',
    label: 'Beginner Drills',
    eyebrow: 'Playable Now',
    summary: 'Short reps focused on one skill at a time.',
    detail: 'Bridge between tutorial and harder solving.',
    route: '/playground/drills',
    Icon: BrainCircuit,
    themeColor: 'emerald',
    badgeClass: 'border-emerald-400/40 bg-emerald-400/12 text-emerald-200',
    borderClass: 'border-emerald-400/35',
    iconClass: 'text-emerald-200',
    locked: false,
  },
  {
    id: 'patterns',
    label: 'Pattern Lab',
    eyebrow: 'Playable Now',
    summary: 'Study seed families, step sessions forward, and inspect raw-vs-translated behavior.',
    detail: 'Svarog research mode.',
    route: '/playground/pattern-lab',
    Icon: Radar,
    themeColor: 'fuchsia',
    badgeClass: 'border-fuchsia-400/40 bg-fuchsia-400/12 text-fuchsia-200',
    borderClass: 'border-fuchsia-400/35',
    iconClass: 'text-fuchsia-200',
    locked: false,
  },
  {
    id: 'pvp',
    label: 'Relic Races',
    eyebrow: 'PvP V1',
    summary: 'Create a private room, share the code, and race the same contract.',
    detail: 'Shared seed, shared relics, faster read wins.',
    route: '/playground/races',
    Icon: Swords,
    themeColor: 'violet',
    badgeClass: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
    borderClass: 'border-violet-400/25',
    iconClass: 'text-violet-200',
    locked: false,
  },
];

export default function PlaygroundPage({ sessionTheme = 'modern' }) {
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const navigate = useNavigate();
  const { isAuthenticated, roleMode } = useAuth();
  const containerRef = useRef(null);
  const showAdminBuilder = isAuthenticated && roleMode === 'admin';

  useEffect(() => {
    if (!containerRef.current) return;
    const q = gsap.utils.selector(containerRef.current);
    gsap.fromTo(q('.gsap-card'), 
      { opacity: 0, y: 40, scale: 0.95 }, 
      { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.1, ease: 'back.out(1.2)' }
    );
  }, []);

  return (
    <div ref={containerRef} className={`min-h-screen px-4 py-12 md:px-8 bg-[#080B14] relative overflow-hidden ${themeConfig.rootClassName || ''}`}>
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] h-[1000px] w-[1000px] rounded-full bg-fuchsia-600/5 blur-[150px]" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[800px] w-[800px] rounded-full bg-cyan-600/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:120px_120px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col gap-10">
        <section className="gsap-card relative overflow-hidden rounded-[3rem] border border-white/5 bg-slate-950/40 px-10 py-12 shadow-2xl backdrop-blur-3xl">
          <div className="relative grid gap-10 xl:grid-cols-[1.2fr_0.8fr] items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.3em] text-fuchsia-200 shadow-lg">
                <Sparkles className="h-4 w-4" />
                Training Grounds Active
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-7xl leading-[1.1]">
                Master the <span className="text-cyan-400">RNG Stream</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
                The Playground is where theory meets execution. Practice reading patterns, calculating detour risks, 
                and building the muscle memory required for perfect Live Mode runs.
              </p>
            </div>

            <div className="rounded-[2.5rem] border border-white/10 bg-black/40 p-8 backdrop-blur-xl shadow-2xl relative group overflow-hidden">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-[100px] group-hover:bg-cyan-500/15 transition-all" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-200">
                  <Trophy className="h-3.5 w-3.5" />
                  Recommended Intake
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-white">Start With Free Mode</h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  The sandbox environment allows you to simulate entire sessions, swap relic sub-stats, and 
                  stress-test logic without spending a single credit.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/playground/free')}
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/12 py-4 text-sm font-black uppercase tracking-[0.2em] text-cyan-100 transition-all hover:bg-cyan-500/25 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                >
                  Enter Simulator
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {MODE_CARDS.map(({ id, label, eyebrow, summary, detail, route, Icon, themeColor, badgeClass, borderClass, iconClass, locked }) => (
            <button
              key={id}
              type="button"
              disabled={locked}
              onClick={() => {
                if (!locked) navigate(route);
              }}
              className={`gsap-card group relative overflow-hidden rounded-[2.5rem] border ${locked ? 'border-white/5 bg-slate-950/20 cursor-default grayscale' : `border-white/10 bg-slate-900/40 hover:border-white/20 hover:-translate-y-1 shadow-xl`} p-8 text-left transition-all duration-500`}
            >
              <div className={`absolute -right-16 -top-16 h-48 w-48 rounded-full bg-${themeColor}-500/5 blur-[80px] transition-all duration-700 group-hover:bg-${themeColor}-500/10`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between gap-4">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${badgeClass}`}>
                    <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
                    {eyebrow}
                  </div>
                  {locked && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                
                <h3 className="mt-8 text-2xl font-black uppercase tracking-tight text-white group-hover:text-cyan-400 transition-colors">{label}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-400 flex-grow">{summary}</p>
                <p className="mt-4 pt-4 border-t border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 group-hover:text-slate-400 transition-colors">
                  {detail}
                </p>
                
                {!locked && (
                   <div className="mt-6 flex justify-end">
                      <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/5 transition-all">
                         <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white" />
                      </div>
                   </div>
                )}
              </div>
            </button>
          ))}

          {showAdminBuilder ? (
            <button
              type="button"
              onClick={() => navigate('/playground/challenge/admin')}
              className="gsap-card group relative overflow-hidden rounded-[2.5rem] border border-amber-400/25 bg-slate-900/45 p-8 text-left shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-amber-300/40"
            >
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-[80px] transition-all duration-700 group-hover:bg-amber-500/15" />

              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
                    <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                    Admin Only
                  </div>
                </div>

                <h3 className="mt-8 text-2xl font-black uppercase tracking-tight text-white transition-colors group-hover:text-amber-200">
                  Challenge Builder
                </h3>
                <p className="mt-4 flex-grow text-sm leading-relaxed text-slate-400">
                  Author a custom challenge in two clicks: choose a seed, shape the relics, enter session rolls, and open it on the real contract board.
                </p>
                <p className="mt-4 border-t border-white/5 pt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 transition-colors group-hover:text-slate-400">
                  For admin contracts, events, and later CRUD
                </p>

                <div className="mt-6 flex justify-end">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 transition-all group-hover:bg-white/5">
                    <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white" />
                  </div>
                </div>
              </div>
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
