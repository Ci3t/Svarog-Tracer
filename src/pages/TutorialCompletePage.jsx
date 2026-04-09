import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, Target, Volume2 } from 'lucide-react';
import { withBaseUrl } from '../utils/assetPaths';

export default function TutorialCompletePage({ sessionTheme = 'modern' }) {
  const navigate = useNavigate();
  const [claraSpeaking, setClaraSpeaking] = useState(false);
  const audioRef = useRef(null);
  const claraImage = claraSpeaking ? withBaseUrl('clara-playground-gif.gif') : withBaseUrl('clara-playground.png');
  const endscreenVoice = withBaseUrl('companions/Clara/tutorial/Clara-tutorial-endscreen.mp3');

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
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleStop);
      audio.removeEventListener('pause', handleStop);
    };
  }, [endscreenVoice]);

  const replayClara = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      setClaraSpeaking(false);
    });
  };

  return (
    <div className={`min-h-screen bg-[#0b1018] px-4 py-8 text-slate-100 md:px-6 lg:px-8 ${sessionTheme ? '' : ''}`}>
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-white/10 bg-[#101520] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-cyan-500/8 blur-3xl" />
              <div className="relative rounded-[1.75rem] border border-white/10 bg-black/25 p-4">
                <img
                  src={claraImage}
                  alt="Clara"
                  className="mx-auto h-[360px] w-full max-w-[240px] object-contain"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Tutorial complete</div>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-white">You finished the full onboarding path</h1>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={replayClara}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-2.5 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  <Volume2 className="h-4 w-4" />
                  Hear Clara
                </button>
                <span className="text-sm text-slate-400">{claraSpeaking ? 'Clara is speaking...' : 'Replay Clara voice'}</span>
              </div>

              <div className="relative rounded-[1.5rem] border border-cyan-400/20 bg-cyan-500/8 px-5 py-4 text-base leading-8 text-slate-100">
                <div className="absolute -left-2 top-8 h-4 w-4 rotate-45 border-l border-b border-cyan-400/20 bg-[#122031]" />
                Oh! You did it! You understand the board and the trend panels so well now. Now, let's head over to the Drills to solidify your knowledge and turn it into muscle memory! I'm so proud of you... let's go do our best!
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center gap-2 text-cyan-200">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-black">Best next move</span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-white">Beginner Drills</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Rehearse one concept at a time with Clara guiding the read before you answer.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/playground/drills')}
                    className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-2.5 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/20"
                  >
                    Go to Drills
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center gap-2 text-amber-200">
                    <Target className="h-4 w-4" />
                    <span className="text-sm font-black">Then try</span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-white">Challenges</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Use the same reads on guided relic routes and start seeing how warnings and setup affect real outcomes.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/playground/challenge')}
                    className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 text-sm font-black text-amber-100 transition hover:bg-amber-500/20"
                  >
                    Go to Challenges
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm leading-7 text-slate-300">
                You can always come back to the tutorial if a concept feels fuzzy again. The board makes more sense after a few real reps.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
