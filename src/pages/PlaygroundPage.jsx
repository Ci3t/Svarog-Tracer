import React, { useMemo, useState } from 'react';
import { Dice5, Lightbulb, RefreshCw, Settings2, Sparkles, Trophy } from 'lucide-react';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';

const MODES = [
  {
    id: 'build',
    label: 'Build Your Own',
    icon: Settings2,
    summary: 'Pick your own lines and practice exact mapping on purpose.',
  },
  {
    id: 'random',
    label: 'Random Relic',
    icon: Dice5,
    summary: 'Generate game-like relics and build intuition through repetition.',
  },
];

const SAMPLE_LINES = [
  'CRIT RATE',
  'CRIT DMG',
  'EFF RES',
  'BREAK EFFECT',
];

export default function PlaygroundPage({ sessionTheme = 'modern' }) {
  const [activeMode, setActiveMode] = useState(MODES[0].id);
  const themeConfig = getSessionThemeConfig(sessionTheme);

  const mode = useMemo(() => MODES.find((entry) => entry.id === activeMode) || MODES[0], [activeMode]);

  return (
    <div className={`min-h-screen px-4 py-8 md:px-8 ${themeConfig.rootClassName || ''}`}>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="theme-glass-card rounded-[2rem] border border-white/10 px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Svarog Playground
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-white md:text-5xl">
                Practice manip without risking a real relic
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
                The tutorial teaches the logic. This page is for reps. Build your own relic path or generate random ones
                that feel closer to the real game.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {MODES.map(({ id, label, icon: Icon, summary }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveMode(id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    activeMode === id
                      ? 'border-violet-400/50 bg-violet-500/12 text-white'
                      : 'border-white/10 bg-black/20 text-slate-300 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-violet-300" />
                    <span className="text-sm font-black uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-xs text-slate-400">{summary}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="theme-glass-card rounded-[2rem] border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{mode.label}</div>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">Relic Practice Board</h2>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 transition-all hover:bg-white/5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <div className="mt-5 rounded-[1.8rem] border border-white/10 bg-black/20 p-5">
              <div className="rounded-2xl border border-violet-500/25 bg-violet-500/8 px-4 py-3 text-sm font-black uppercase tracking-wide text-violet-200">
                Main Stat: CRIT RATE
              </div>

              <div className="mt-4 grid gap-3">
                {SAMPLE_LINES.map((line, index) => (
                  <div
                    key={`${line}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Line {index + 1}</div>
                    <div className="text-sm font-black uppercase text-white">{line}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-200 transition-all hover:bg-cyan-500/20"
                >
                  Add Sub / Upgrade
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-amber-200 transition-all hover:bg-amber-500/20"
                >
                  Reveal Hint
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-white/10"
                >
                  Explain Result
                </button>
              </div>
            </div>
          </article>

          <div className="grid gap-6">
            <article className="theme-glass-card rounded-[2rem] border border-white/10 p-6">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-300" />
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Mode goal</div>
              </div>
              <h3 className="mt-3 text-xl font-black uppercase tracking-tight text-white">{mode.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{mode.summary}</p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                {activeMode === 'build'
                  ? 'Pick your own line setup and test whether your predicted commons actually land where you expect.'
                  : 'Generate realistic relics, take your best next-line guess, and see whether your read was correct.'}
              </div>
            </article>

            <article className="theme-glass-card rounded-[2rem] border border-white/10 p-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-300" />
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Practice tracker</div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Attempts</div>
                  <div className="mt-2 text-3xl font-black text-white">0</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Correct</div>
                  <div className="mt-2 text-3xl font-black text-emerald-300">0</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Streak</div>
                  <div className="mt-2 text-3xl font-black text-amber-300">0</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/8 p-4 text-sm leading-relaxed text-slate-300">
                Random mode should eventually score the player on whether they predicted the next line correctly and how
                often they identified the right forced setup.
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
