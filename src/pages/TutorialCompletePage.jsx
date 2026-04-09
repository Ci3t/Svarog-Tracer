import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, Target, Volume2 } from 'lucide-react';
import { withBaseUrl } from '../utils/assetPaths';
import { useAuth } from '../hooks/useAuth';
import { resolvePlaygroundClaraAsset } from '../utils/claraCosmetics';
import { buildApiUrl } from '../utils/apiBase';
import { TUTORIAL_LEVELS } from '../data/tutorialLevelConfigs';

const TUTORIAL_GUIDE_PROGRESS_KEY = 'svarog_tutorial_guide_progress_v1';

function readTutorialGuideProgress() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TUTORIAL_GUIDE_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function TutorialCompletePage({ sessionTheme = 'modern' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getAuthHeader, replaceUser } = useAuth();
  const [claraSpeaking, setClaraSpeaking] = useState(false);
  const [completionReward, setCompletionReward] = useState(null);
  const audioRef = useRef(null);
  const completionSyncRef = useRef(false);
  const claraImage = resolvePlaygroundClaraAsset(user?.user_metadata || {}, { speaking: claraSpeaking });
  const endscreenVoice = withBaseUrl('companions/Clara/tutorial/Clara-tutorial-endscreen.mp3');

  const guideProgress = useMemo(() => readTutorialGuideProgress(), []);
  const completedGuideStages = Math.max(
    Number(location.state?.completedGuideStages || 0) || 0,
    Object.values(guideProgress).filter(Boolean).length,
  );
  const requiredGuideStages = TUTORIAL_LEVELS.length;
  const resolvedGuideCompleted = Boolean(location.state?.guideCompleted || completedGuideStages >= requiredGuideStages);

  useEffect(() => {
    const audio = new Audio(endscreenVoice);
    audioRef.current = audio;

    const handlePlay = () => setClaraSpeaking(true);
    const handleStop = () => setClaraSpeaking(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleStop);
    audio.addEventListener('pause', handleStop);

    const timeoutId = window.setTimeout(() => {
      audio.play().catch(() => {
        setClaraSpeaking(false);
      });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleStop);
      audio.removeEventListener('pause', handleStop);
    };
  }, [endscreenVoice]);

  useEffect(() => {
    if (!user?.id || completionSyncRef.current) return;
    completionSyncRef.current = true;

    fetch(buildApiUrl('/api/profile'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        action: 'complete_tutorial',
        guideCompleted: resolvedGuideCompleted,
        completedGuideStages,
      }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || 'Failed to finalize tutorial completion.');
        }
        if (payload?.user) replaceUser?.(payload.user);
        setCompletionReward(payload || null);
      })
      .catch(() => {
        completionSyncRef.current = false;
      });
  }, [completedGuideStages, getAuthHeader, replaceUser, resolvedGuideCompleted, user?.id]);

  const replayClara = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      setClaraSpeaking(false);
    });
  };

  return (
    <div className={`min-h-screen bg-[#06090f] flex items-center justify-center p-4 md:p-8 ${sessionTheme ? '' : ''}`}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-cyan-500/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-emerald-500/10 blur-[150px]" />
      </div>

      <div className="relative w-full max-w-6xl">
        <div className="rounded-[3rem] border border-white/10 bg-[#0a0f18]/90 p-8 shadow-[0_60px_150px_rgba(0,0,0,0.8)] backdrop-blur-3xl md:p-12">
          <div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-cyan-500/10 blur-[60px]" />
              <div className="relative rounded-[2.5rem] border border-white/10 bg-black/30 p-6">
                <img
                  src={claraImage}
                  alt="Clara"
                  className="mx-auto h-[420px] w-full object-contain drop-shadow-[0_35px_70px_rgba(0,0,0,0.85)]"
                />
              </div>
            </div>

            <div className="space-y-8">
              <header>
                <div className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300">Tutorial complete</div>
                <h1 className="mt-3 text-5xl font-black tracking-tight text-white">You finished the full tutorial</h1>
              </header>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={replayClara}
                  className="inline-flex items-center gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  <Volume2 className="h-4 w-4" />
                  Hear Clara
                </button>
                <span className="text-sm text-slate-400">{claraSpeaking ? 'Clara is speaking...' : 'Replay Clara voice'}</span>
              </div>

              <div className="relative rounded-[2rem] border-[3px] border-neutral-900 bg-white px-6 py-5 text-lg leading-8 text-black shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                <div className="absolute -left-2 top-8 h-4 w-4 rotate-45 border-l-[3px] border-b-[3px] border-neutral-900 bg-white" />
                Oh! You did it! You understand the board and the trend panels so well now. Now, let&apos;s head over to the Drills to solidify your knowledge and turn it into muscle memory! I&apos;m so proud of you... let&apos;s go do our best!
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm text-slate-300">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">Tutorial rewards</div>
                <div className="mt-3 leading-7">
                  {completionReward ? (
                    resolvedGuideCompleted
                      ? `Full Clara guide complete. ${Number(completionReward.tokensGained || 0)} tokens were added to your wallet.`
                      : `Tutorial cleared with Clara guide partially skipped. You kept progress, but only the starter reward was granted.`
                  ) : 'Syncing your tutorial completion and reward state...'}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate('/playground/drills')}
                  className="rounded-[2rem] border border-white/10 bg-black/20 p-6 text-left transition hover:border-cyan-400/40 hover:bg-black/30"
                >
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-[11px] font-black uppercase tracking-[0.28em]">Next move</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-white">Beginner Drills</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    Rehearse one idea at a time with Clara guiding the read before you answer.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-cyan-200">
                    Go to Drills
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/playground/challenge')}
                  className="rounded-[2rem] border border-white/10 bg-black/20 p-6 text-left transition hover:border-amber-400/40 hover:bg-black/30"
                >
                  <div className="flex items-center gap-2 text-amber-300">
                    <Target className="h-4 w-4" />
                    <span className="text-[11px] font-black uppercase tracking-[0.28em]">Then try</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-white">Challenges</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    Use the same reads on guided relic routes once you want real outcome pressure.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-amber-200">
                    Go to Challenges
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
