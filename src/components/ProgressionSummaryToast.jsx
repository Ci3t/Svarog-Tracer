import React, { useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import { gsap } from 'gsap';

const PROGRESSION_RARITY_TONE = {
  common: {
    border: 'border-white/10',
    background: 'bg-white/[0.03]',
    text: 'text-slate-100',
    meta: 'text-slate-400',
  },
  rare: {
    border: 'border-cyan-400/20',
    background: 'bg-cyan-500/[0.08]',
    text: 'text-cyan-100',
    meta: 'text-cyan-200/70',
  },
  epic: {
    border: 'border-violet-400/20',
    background: 'bg-violet-500/[0.08]',
    text: 'text-violet-100',
    meta: 'text-violet-200/70',
  },
  legendary: {
    border: 'border-amber-400/20',
    background: 'bg-amber-500/[0.08]',
    text: 'text-amber-100',
    meta: 'text-amber-200/70',
  },
  mythic: {
    border: 'border-fuchsia-400/20',
    background: 'bg-fuchsia-500/[0.08]',
    text: 'text-fuchsia-100',
    meta: 'text-fuchsia-200/70',
  },
};

function getProgressionTone(rarity = 'common') {
  return PROGRESSION_RARITY_TONE[String(rarity || 'common').trim().toLowerCase()] || PROGRESSION_RARITY_TONE.common;
}

export default function ProgressionSummaryToast({
  summary,
  title = 'Progress update',
  subtitle = '',
  onClose,
}) {
  const panelRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    if (!summary || !panelRef.current) return undefined;
    const panel = panelRef.current;
    const ctx = gsap.context(() => {
      gsap.killTweensOf(panel);
      gsap.killTweensOf(barRef.current);
      gsap.fromTo(
        panel,
        { opacity: 0, y: 16, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: 'power2.out' },
      );
      if (barRef.current) {
        gsap.fromTo(
          barRef.current,
          { width: '0%' },
          {
            width: `${Math.max(0, Math.min(100, summary.progressPercent || 0))}%`,
            duration: 0.35,
            delay: 0.14,
            ease: 'power2.out',
          },
        );
      }
    }, panel);
    return () => ctx.revert();
  }, [summary]);

  if (!summary) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[92] flex justify-center px-4">
      <div
        ref={panelRef}
        className="pointer-events-auto w-full max-w-[520px] rounded-xl border border-white/10 bg-[#0b1020]/95 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              {title}
            </div>
            {subtitle ? <div className="mt-1 text-sm font-semibold tracking-tight text-white">{subtitle}</div> : null}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
              <span>+{summary.xpGained || 0} XP</span>
              <span>Lv {summary.levelAfter || 1}</span>
              {summary.leveledUp ? <span className="text-emerald-300">Level up</span> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close progression summary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[170px_minmax(0,1fr)]">
          <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[11px] font-medium text-slate-400">Season level</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-white">Lv {summary.levelAfter || 1}</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                ref={barRef}
                className="h-full rounded-full bg-[var(--theme-accent)]"
                style={{ width: `${Math.max(0, Math.min(100, summary.progressPercent || 0))}%` }}
              />
            </div>
            <div className="mt-2 text-[12px] text-slate-400">
              {summary.currentLevelXp || 0} / {summary.nextLevelXp || 0} XP this level
            </div>
          </div>

          <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
            {Array.isArray(summary.unlockedRewards) && summary.unlockedRewards.length > 0 ? (
              <>
                <div className="text-[11px] font-medium text-slate-400">Unlocked rewards</div>
                <div className="mt-3 grid gap-2">
                  {summary.unlockedRewards.map((reward) => {
                    const tone = getProgressionTone(reward.rarity);
                    return (
                      <div key={reward.key} className={`rounded-lg border px-3 py-3 ${tone.border} ${tone.background}`}>
                        <div className={`text-[13px] font-semibold ${tone.text}`}>{reward.name}</div>
                        <div className={`mt-1 text-[11px] ${tone.meta}`}>
                          {reward.grantTokens > 0 ? `${reward.grantTokens} tokens ready to claim` : `${reward.rewardType} unlocked`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : summary.nextReward ? (
              <>
                <div className="text-[11px] font-medium text-slate-400">Next reward</div>
                <div className="mt-3 rounded-lg border border-white/8 bg-black/20 px-3 py-3">
                  <div className="text-[13px] font-semibold text-white">{summary.nextReward.name}</div>
                  <div className="mt-1 text-[11px] text-slate-400">Unlocks at level {summary.nextReward.targetLevel}</div>
                  <div className="mt-2 text-[11px] font-semibold text-slate-200">{summary.nextReward.xpRemaining} XP left</div>
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] font-medium text-slate-400">Progression</div>
                <div className="mt-3 rounded-lg border border-white/8 bg-black/20 px-3 py-3 text-[12px] text-slate-300">
                  No new reward unlocked on this run, but your season profile has been updated.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
