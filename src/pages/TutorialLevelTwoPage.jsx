import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShieldQuestion, Target, Wand2 } from 'lucide-react';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';

function ChallengeRelicCard({ title, subtitle, lines, accent = 'cyan' }) {
  const accentClasses =
    accent === 'rose'
      ? 'border-rose-400/25 bg-rose-500/8 text-rose-200'
      : accent === 'amber'
        ? 'border-amber-400/25 bg-amber-500/8 text-amber-200'
        : 'border-cyan-400/25 bg-cyan-500/8 text-cyan-200';

  return (
    <article className="theme-glass-card rounded-[2rem] border border-white/10 p-6">
      <div className="mb-5">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{subtitle}</div>
        <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">{title}</h2>
      </div>

      <div className={`rounded-2xl border px-4 py-3 ${accentClasses}`}>
        <div className="text-[10px] font-black uppercase tracking-[0.2em]">Challenge relic</div>
        <div className="mt-1 text-sm font-black uppercase">Sequence comes next after UI signoff</div>
      </div>

      <div className="mt-4 grid gap-3">
        {lines.map((line) => (
          <div
            key={`${title}-${line.slot}`}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Line {line.slot}</div>
              <div className="mt-1 text-sm font-black uppercase text-white">{line.label}</div>
            </div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{line.state}</div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function TutorialLevelTwoPage({ sessionTheme = 'modern' }) {
  const navigate = useNavigate();
  const themeConfig = getSessionThemeConfig(sessionTheme);

  return (
    <div className={`min-h-screen px-4 py-8 md:px-8 ${themeConfig.rootClassName || ''}`}>
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6">
        <section className="theme-glass-card rounded-[2rem] border border-white/10 px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-5xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-rose-200">
                <ShieldQuestion className="h-3.5 w-3.5" />
                Tutorial Level 2
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-white md:text-5xl">
                Solo Manip Challenge
              </h1>
              <p className="mt-3 max-w-4xl text-sm text-slate-300 md:text-base">
                This is the next tutorial level where the player solves the manip alone. We keep the live board, then
                give them multiple reset relic options and let them choose the correct setup path.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/tutorial')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
                Back To Level 1
              </button>
              <button
                type="button"
                onClick={() => navigate('/playground')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-200 transition-all hover:bg-cyan-500/20"
              >
                Playground Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <article className="theme-glass-card rounded-[2rem] border border-white/10 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Challenge board</div>
                <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">Live read stays visible</h2>
              </div>
              <Target className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Why this page exists</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                  Level 1 taught the guided flow. Level 2 will keep the same live-state board visible, but the player
                  will have to decide which reset relic to use without the scripted coach doing it for them.
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rule 1</div>
                  <div className="mt-2 text-sm font-black uppercase text-white">Read the active pair first</div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    The predictor and history still anchor the decision. The challenge is choosing the reset path.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rule 2</div>
                  <div className="mt-2 text-sm font-black uppercase text-white">Pick the correct setup relic</div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    We will add 1-line and 2-line choices here so the player has to pick the right manip path.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rule 3</div>
                  <div className="mt-2 text-sm font-black uppercase text-white">Pass without guidance</div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    The sequence and success check come next. This page is the shell we will plug that challenge into.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="theme-glass-card rounded-[2rem] border border-white/10 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Reset choices</div>
                <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">The player chooses the detour</h2>
              </div>
              <Wand2 className="h-5 w-5 text-rose-200" />
            </div>

            <div className="grid gap-4">
              <ChallengeRelicCard
                title="1-Line Reset"
                subtitle="Option A"
                accent="amber"
                lines={[
                  { slot: 1, label: 'OPEN LINE', state: 'one-line relic' },
                  { slot: 2, label: 'LOCKED', state: 'future fill' },
                ]}
              />
              <ChallengeRelicCard
                title="2-Line Reset"
                subtitle="Option B"
                accent="cyan"
                lines={[
                  { slot: 1, label: 'HP%', state: 'locked' },
                  { slot: 2, label: 'SPD', state: 'locked' },
                  { slot: 3, label: 'OPEN LINE', state: 'force target' },
                ]}
              />
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
