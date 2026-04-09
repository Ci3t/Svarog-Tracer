import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, ChevronRight, Play, RefreshCw, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernSessionTable from '../components/modern/ModernSessionTable';
import { translateTo4 } from '../utils/stringHelpers';
import { withBaseUrl } from '../utils/assetPaths';
import { useAuth } from '../hooks/useAuth';
import { usePvpSeasonStats } from '../hooks/usePvpSeasonStats';
import { buildApiUrl } from '../utils/apiBase';
import { DRILLS_QUESTION_BANK } from '../data/drillsQuestionBank';
import { resolveGuideClaraAsset } from '../utils/claraCosmetics';

const DRILLS_TOUR_STORAGE_KEY = 'svarog-drills-tour-v1';
const DRILLS_CLARA_VOLUME_KEY = 'svarog-drills-clara-volume-v1';
const DRILLS_CLARA_MUTED_KEY = 'svarog-drills-clara-muted-v1';
const DRILLS_TOUR_STEPS = [
  {
    target: '#drills-mission-strip',
    title: 'Mission strip',
    body: 'This top strip is your drill index. Use it to see your current question, jump back to earlier questions, and restart the sequence if you want a clean run.',
    placement: 'bottom',
  },
  {
    target: '#drills-sensor-feed',
    title: 'Predictor feed',
    body: 'When a drill has enough setup rolls, this panel shows the actual predictor and session feed you should read before answering.',
    placement: 'bottom',
  },
  {
    target: '#drills-mission-console',
    title: 'Mission Console',
    body: 'This is your guided lesson panel. The tactical briefing provides context, while the mission grid contains your possible responses.',
    placement: 'top',
  },
  {
    target: '#drills-mission-console',
    title: 'Ready outer',
    body: 'That is the full flow. Clara will now hand control back to the live drill sequence so the first lesson can begin properly.',
    placement: 'top',
    playReadyVoice: true,
  },
];

function DrillsTourOverlay({ steps, currentStep, onNext, onClose }) {
  const [rect, setRect] = useState(null);
  const step = steps[currentStep];

  useEffect(() => {
    if (!step?.target) return undefined;

    const update = () => {
      const element = document.querySelector(step.target);
      if (!element) {
        setRect(null);
        return;
      }
      const nextRect = element.getBoundingClientRect();
      setRect(nextRect);
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step]);

  if (!step || !rect) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = 360;
  const cardHeight = 220;
  const gap = 20;

  let top = rect.top;
  let left = rect.right + gap;

  if (step.placement === 'left') {
    left = rect.left - cardWidth - gap;
  } else if (step.placement === 'bottom') {
    left = rect.left + (rect.width / 2) - (cardWidth / 2);
    top = rect.bottom + gap;
  } else if (step.placement === 'top') {
    left = rect.left + (rect.width / 2) - (cardWidth / 2);
    top = rect.top - cardHeight - gap;
  }

  left = Math.min(Math.max(left, 20), viewportWidth - cardWidth - 20);
  top = Math.min(Math.max(top, 20), viewportHeight - cardHeight - 20);

  return (
    <div className="fixed inset-0 z-[300]">
      <div className="absolute inset-0 bg-black/72" />
      <div
        className="absolute rounded-[2rem] border border-cyan-400/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
        }}
      />
      <div
        className="absolute w-[360px] rounded-[1.75rem] border border-white/10 bg-[#0d121c]/96 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
        style={{ top, left }}
      >
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
          Drills tour
        </div>
        <h3 className="mt-3 text-xl font-black uppercase tracking-tight text-white">
          {step.title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {step.body}
        </p>
        <div className="mt-6 flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {currentStep + 1}/{steps.length}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 transition-colors hover:text-white"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-xl border border-cyan-400/30 bg-cyan-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition-colors hover:border-cyan-300 hover:text-white"
            >
              {currentStep === steps.length - 1 ? 'Begin drills' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function createSessionEntry(rawValue) {
  const normalized = String(rawValue || '').trim();
  if (!/^[1-4]{2}$/.test(normalized)) return null;
  const translated = /^4[1-4]$/.test(normalized) ? normalized : translateTo4(normalized);
  if (!translated || !/^4[1-4]$/.test(translated)) return null;
  return {
    id: `drill-entry-${normalized}-${Math.random().toString(36).slice(2, 8)}`,
    raw: normalized,
    translated,
    s2: translated,
    s3: '',
    s4: '',
    s5: '',
    time: new Date().toISOString(),
  };
}

function buildEntryRows(entries = []) {
  return entries.map(createSessionEntry).filter(Boolean);
}

export default function PlaygroundDrillsPage({ sessionTheme = 'modern' }) {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const { data: seasonData } = usePvpSeasonStats();
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const drills = useMemo(() => DRILLS_QUESTION_BANK, []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sessionTab, setSessionTab] = useState('current');
  const [claraSpeaking, setClaraSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [activeVoicePath, setActiveVoicePath] = useState('');
  const [claraVolume, setClaraVolume] = useState(() => {
    if (typeof window === 'undefined') return 0.6;
    const stored = Number(window.localStorage.getItem(DRILLS_CLARA_VOLUME_KEY));
    return Number.isFinite(stored) ? Math.max(0, Math.min(1, stored)) : 0.6;
  });
  const [claraMuted, setClaraMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DRILLS_CLARA_MUTED_KEY) === '1';
  });
  const [progressionSummary, setProgressionSummary] = useState(null);
  const [progressionSyncing, setProgressionSyncing] = useState(false);
  const [tourRunning, setTourRunning] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const drillSessionKeyRef = useRef(`drills-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const loggedDrillSessionRef = useRef('');
  const claraAudioRef = useRef(null);
  const claraAutoplayTimeoutRef = useRef(null);
  const readyVoicePlayedRef = useRef(false);

  const currentDrill = drills[currentIndex];
  const isComplete = currentIndex >= drills.length;
  const currentEntries = useMemo(
    () => buildEntryRows(currentDrill?.starterRolls || []),
    [currentDrill]
  );
  const hasPredictorContext = currentEntries.length >= 6;
  
  const claraImageSrc = claraSpeaking
    ? resolveGuideClaraAsset(user?.user_metadata || {}, { speaking: true })
    : resolveGuideClaraAsset(user?.user_metadata || {}, {
      speaking: false,
      sad: revealed && selectedAnswer !== currentDrill?.correctAnswer,
    });

  const stopClaraAudio = () => {
    if (!claraAudioRef.current) return;
    claraAudioRef.current.pause();
    claraAudioRef.current.currentTime = 0;
    claraAudioRef.current = null;
    setClaraSpeaking(false);
    setVoiceLoading(false);
    setActiveVoicePath('');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DRILLS_CLARA_VOLUME_KEY, String(claraVolume));
  }, [claraVolume]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DRILLS_CLARA_MUTED_KEY, claraMuted ? '1' : '0');
  }, [claraMuted]);

  useEffect(() => {
    if (!claraAudioRef.current) return;
    claraAudioRef.current.volume = claraMuted ? 0 : claraVolume;
  }, [claraMuted, claraVolume]);

  const playClaraAudio = (audioPath) => {
    if (!audioPath) return;
    stopClaraAudio();

    const audio = new Audio(encodeURI(withBaseUrl(audioPath)));
    audio.volume = claraMuted ? 0 : claraVolume;
    claraAudioRef.current = audio;
    setActiveVoicePath(audioPath);
    setVoiceLoading(true);
    setClaraSpeaking(true);

    const stopSpeaking = () => {
      setClaraSpeaking(false);
      setVoiceLoading(false);
      if (claraAudioRef.current === audio) {
        claraAudioRef.current = null;
      }
    };

    audio.addEventListener('ended', stopSpeaking, { once: true });
    audio.addEventListener('error', stopSpeaking, { once: true });
    audio.play()
      .then(() => setVoiceLoading(false))
      .catch(() => stopSpeaking());
  };

  useEffect(() => {
    stopClaraAudio();
    if (claraAutoplayTimeoutRef.current) {
      window.clearTimeout(claraAutoplayTimeoutRef.current);
      claraAutoplayTimeoutRef.current = null;
    }
    if (!tourRunning && !revealed && currentDrill?.voicePath) {
      claraAutoplayTimeoutRef.current = window.setTimeout(() => {
        playClaraAudio(currentDrill.voicePath);
        claraAutoplayTimeoutRef.current = null;
      }, 1000);
    }
    return undefined;
  }, [currentDrill?.id, tourRunning]);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(DRILLS_TOUR_STORAGE_KEY);
      if (!seen) {
        const timer = window.setTimeout(() => setTourRunning(true), 500);
        return () => window.clearTimeout(timer);
      }
    } catch {
      const timer = window.setTimeout(() => setTourRunning(true), 500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!tourRunning) {
      readyVoicePlayedRef.current = false;
      return undefined;
    }
    stopClaraAudio();
    if (claraAutoplayTimeoutRef.current) {
      window.clearTimeout(claraAutoplayTimeoutRef.current);
      claraAutoplayTimeoutRef.current = null;
    }
    const step = DRILLS_TOUR_STEPS[tourStepIndex];
    if (step?.playReadyVoice && !readyVoicePlayedRef.current) {
      readyVoicePlayedRef.current = true;
      playClaraAudio('companions/Clara/drills-sound/Clara-Ready-outer.mp3');
    }
    return undefined;
  }, [tourRunning, tourStepIndex]);

  useEffect(() => () => {
    if (claraAutoplayTimeoutRef.current) {
      window.clearTimeout(claraAutoplayTimeoutRef.current);
      claraAutoplayTimeoutRef.current = null;
    }
    stopClaraAudio();
  }, []);

  const handlePlayClaraVoice = () => {
    if (claraSpeaking && activeVoicePath === currentDrill?.voicePath) {
      stopClaraAudio();
      return;
    }
    playClaraAudio(currentDrill?.voicePath);
  };

  const toggleClaraMute = () => {
    setClaraMuted((current) => !current);
  };

  const closeTour = () => {
    setTourRunning(false);
    setTourStepIndex(0);
    try {
      window.localStorage.setItem(DRILLS_TOUR_STORAGE_KEY, 'seen');
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      if (!revealed && currentDrill?.voicePath) {
        playClaraAudio(currentDrill.voicePath);
      }
    }, 500);
  };

  const nextTourStep = () => {
    if (tourStepIndex >= DRILLS_TOUR_STEPS.length - 1) {
      closeTour();
      return;
    }
    setTourStepIndex((value) => value + 1);
  };

  const handleReveal = (answer) => {
    if (revealed || isComplete) return;
    const isCorrect = answer === currentDrill.correctAnswer;
    setSelectedAnswer(answer);
    setRevealed(true);
    setAnswers((current) => ({ ...current, [currentDrill.id]: { answer, correct: isCorrect } }));
    if (isCorrect) {
      setScore((current) => current + 1);
    }
    playClaraAudio(isCorrect ? 'companions/Clara/drills-sound/Clara-Success.mp3' : 'companions/Clara/drills-sound/Clara-mistake.mp3');
  };

  const handleNext = () => {
    if (currentIndex + 1 >= drills.length) {
      if (score >= drills.length) {
        setSelectedAnswer('');
        setRevealed(false);
        setCurrentIndex(drills.length);
        return;
      }
      setCurrentIndex(0);
      setSelectedAnswer('');
      setRevealed(false);
      setScore(0);
      setAnswers({});
      setSessionTab('current');
      return;
    }

    setSelectedAnswer('');
    setRevealed(false);
    setCurrentIndex((current) => current + 1);
  };

  const handleRestart = () => {
    drillSessionKeyRef.current = `drills-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    loggedDrillSessionRef.current = '';
    setProgressionSummary(null);
    setProgressionSyncing(false);
    setCurrentIndex(0);
    setSelectedAnswer('');
    setRevealed(false);
    setScore(0);
    setAnswers({});
    setSessionTab('current');
  };

  useEffect(() => {
    if (!isComplete || !user?.id) return;
    const sessionKey = drillSessionKeyRef.current;
    if (!sessionKey || loggedDrillSessionRef.current === sessionKey) return;
    loggedDrillSessionRef.current = sessionKey;
    setProgressionSyncing(true);

    fetch(buildApiUrl('/api/playground'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        mode: 'drills',
        sessionKey,
        score,
        success: score > 0,
        sourceMode: 'guided',
        rowsCount: drills.length,
        detail: {
          perfect: score >= drills.length,
          answered_count: Object.keys(answers || {}).length,
          drill_count: drills.length,
        },
      }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json().catch(() => null);
      })
      .then((payload) => {
        if (!payload?.success || payload?.duplicate || !payload?.progressionDelta) return;
        setProgressionSummary(payload.progressionDelta);
      })
      .catch(() => {})
      .finally(() => {
        setProgressionSyncing(false);
      });
  }, [answers, drills.length, getAuthHeader, isComplete, score, user?.id]);

  return (
    <div className={`playground-theme-shell min-h-screen bg-[#080b12] px-4 py-12 text-slate-200 md:px-8 [&_button:not(:disabled)]:cursor-pointer ${themeConfig.rootClassName || ''} flex flex-col`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes holographic-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}} />

      <div className="mx-auto w-full max-w-5xl flex-1 flex flex-col">
        {tourRunning ? (
          <DrillsTourOverlay
            steps={DRILLS_TOUR_STEPS}
            currentStep={tourStepIndex}
            onNext={nextTourStep}
            onClose={closeTour}
          />
        ) : null}
        
        {/* TOP NAV PANE */}
        <div id="drills-mission-strip" className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 md:border-none md:pb-0">
          <div className="flex items-center gap-4">
             <button
               type="button"
               onClick={() => navigate('/playground')}
               className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-white"
             >
               <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
               Evacuate
             </button>
             
             <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-rose-400 transition-colors"
             >
                <RefreshCw className="h-3 w-3" />
                Restart Matrix
             </button>
             <button
                type="button"
                onClick={() => {
                  setTourStepIndex(0);
                  setTourRunning(true);
                }}
                className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300 hover:text-white transition-colors"
             >
                <Play className="h-3 w-3" />
                Guided Tour
             </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 md:justify-end flex-1 max-w-xl">
             {drills.map((drill, index) => {
                const answerState = answers[drill.id];
                const isCurrent = index === currentIndex;
                const num = (index + 1).toString().padStart(2, '0');
                
                return (
                   <button
                     key={drill.id}
                     type="button"
                     onClick={() => {
                       setCurrentIndex(index);
                       setSelectedAnswer('');
                       setRevealed(Boolean(answerState));
                       if (answerState) setSelectedAnswer(answerState.answer);
                     }}
                     className={`group relative flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg border text-[9px] sm:text-[10px] font-black transition-all ${
                        isCurrent 
                          ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-110 z-10'
                          : answerState?.correct
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400/80 hover:bg-emerald-500/20 hover:text-emerald-300'
                            : answerState && !answerState.correct
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-400/80 hover:bg-rose-500/20'
                              : 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/20 hover:text-slate-300'
                     }`}
                   >
                      <span className="relative z-10">{num}</span>
                      <div className="pointer-events-none absolute bottom-[calc(100%+8px)] right-0 md:left-1/2 md:-translate-x-1/2 z-50 flex flex-col items-end md:items-center opacity-0 transition-opacity group-hover:opacity-100">
                         <div className="whitespace-nowrap rounded border border-white/10 bg-slate-900/95 px-2 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-xl backdrop-blur-md">
                           {drill.title}
                         </div>
                      </div>
                   </button>
                );
             })}
          </div>
        </div>

        {isComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gsap-fade-up">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-emerald-500/20 p-4 ring-2 ring-emerald-400/50 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
               <ShieldCheck className="h-12 w-12 text-emerald-400" />
            </div>
            <div className="mb-2 text-[12px] font-black uppercase tracking-[0.4em] text-emerald-400 drop-shadow-md font-black">Drill Sequence Cleared</div>
            <h2 className="text-5xl font-black uppercase tracking-tight text-white drop-shadow-lg font-black">Rank: Tactical Expert</h2>
            <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-slate-400 font-semibold tracking-wider">
              You've successfully analyzed the core patterns. The simulator logic is now unlocked. Time to step into the real challenges.
            </p>

            <div className="mt-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-black/35 p-5 text-left shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 font-black">
                    Season Progress
                  </div>
                  <div className="mt-2 text-2xl font-black text-white font-black">
                    {progressionSummary ? `+${progressionSummary.xpGained || 0} XP${Number(progressionSummary.tokensGained || 0) > 0 ? ` · +${progressionSummary.tokensGained} tokens` : ""}` : (progressionSyncing ? 'Syncing...' : 'No XP logged')}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-right">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300 font-black">Season level</div>
                  <div className="mt-1 text-lg font-black text-white font-black">
                    {progressionSummary ? `Lv ${progressionSummary.levelAfter || 1}` : '--'}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 font-black">
                  <span>Level XP</span>
                  <span>
                    {progressionSummary
                      ? `${progressionSummary.currentLevelXp || 0}/${progressionSummary.nextLevelXp || 0}`
                      : (progressionSyncing ? 'Waiting...' : '--/--')}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-700 ease-out"
                    style={{ width: `${progressionSummary ? Math.max(0, Math.min(100, progressionSummary.progressPercent || 0)) : 0}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 font-black">Reward status</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {progressionSummary
                    ? Array.isArray(progressionSummary.unlockedRewards) && progressionSummary.unlockedRewards.length > 0
                      ? progressionSummary.unlockedRewards.map((reward) => reward.name).join(' • ')
                      : progressionSummary.nextReward
                        ? `${progressionSummary.nextReward.xpRemaining} XP left to ${progressionSummary.nextReward.name}`
                        : 'No pending reward from this clear'
                    : (progressionSyncing ? 'Checking reward unlocks...' : 'No progression update available')}
                </div>
                {progressionSummary && Array.isArray(progressionSummary.unlockedRewards) && progressionSummary.unlockedRewards.length > 0 ? (
                  <div className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200/90">
                    {progressionSummary.unlockedRewards
                      .map((reward) => reward.rewardType === 'companion' ? `${reward.name} added to arsenal` : `${reward.name} unlocked`)
                      .join(' · ')}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/playground/challenge')}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-amber-400/50 bg-amber-500/20 px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-amber-100 transition-all hover:bg-amber-500/30 hover:shadow-[0_0_30px_rgba(251,191,36,0.3)] shadow-2xl"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
                <span className="relative z-10 flex items-center gap-2 font-black">
                   Enter Challenge Mode
                   <ChevronRight className="h-5 w-5" />
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-5 max-w-4xl mx-auto w-full gsap-fade-up">
            {/* HUD / ARENA HEADER */}
            <div className="flex items-end justify-between px-2 pt-2">
               {(() => {
                 const liveProgression = progressionSummary || seasonData?.profile?.progression;
                 const liveLevel = liveProgression?.levelProgress?.level ?? seasonData?.profile?.levelProgress?.level ?? 1;
                 const livePct = liveProgression?.levelProgress?.progressPercent ?? liveProgression?.progressPercent ?? (score / drills.length) * 100;
                 return (
                   <div className="flex flex-col flex-1 max-w-[240px]">
                     <div className="flex justify-between items-end mb-1">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 font-black">Player</span>
                       <span className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-500/80 font-black">
                         Lv {progressionSummary ? (progressionSummary.levelAfter || 1) : liveLevel}
                       </span>
                     </div>
                     <div className="h-2 w-full bg-black/60 border border-emerald-500/20 rounded-full overflow-hidden shadow-inner">
                       <div
                         className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-700 ease-out"
                         style={{ width: `${Math.max(0, Math.min(100, livePct || 0))}%` }}
                       />
                     </div>
                     <span className="text-[8px] uppercase font-black tracking-[0.15em] mt-1.5 text-slate-500 font-black">
                       Score {score}/{drills.length}
                     </span>
                   </div>
                 );
               })()}
               
               <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-rose-500 border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(244,63,94,0.2)] mb-1.5 font-black">
                     Rival: Drill {String(currentIndex + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xl font-black uppercase tracking-tight text-white drop-shadow-md text-right leading-none font-black opacity-80">
                     {currentDrill.title}
                  </span>
               </div>
            </div>

            {/* THE BATTLEFIELD (Predictor & Session) */}
            <div id="drills-sensor-feed" className="relative rounded-[2rem] border border-white/5 bg-gradient-to-b from-slate-900/60 to-slate-950/80 p-5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-white/5">
                {hasPredictorContext ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                     <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                           <BrainCircuit className="h-4 w-4 text-cyan-400" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 drop-shadow-md font-black">Predictor Matrix</span>
                        </div>
                        <div className="rounded-[1.25rem] border border-white/10 bg-black/40 overflow-hidden shadow-inner font-black">
                           <ModernPairPredictorCard entries={currentEntries} region="America" />
                        </div>
                     </div>

                     <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 drop-shadow-md pb-1 border-b border-cyan-400/30 font-black">Session Data</span>
                           <div className="flex bg-black/40 rounded-full border border-white/5 p-0.5">
                              {['current', 'history'].map((tab) => (
                                 <button
                                   key={tab}
                                   type="button"
                                   onClick={() => setSessionTab(tab)}
                                   className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] transition-all ${
                                      sessionTab === tab ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-500 hover:text-slate-300'
                                   }`}
                                 >
                                   {tab}
                                 </button>
                              ))}
                           </div>
                        </div>
                        <div className="flex-1 rounded-[1.25rem] border border-white/10 bg-black/40 overflow-y-auto shadow-inner p-3 min-h-[150px]">
                            <ModernSessionTable
                              sessionTab={sessionTab}
                              setSessionTab={setSessionTab}
                              entries={currentEntries}
                              prevSessions={[]}
                              onDeleteEntry={() => {}}
                              onDeleteSession={() => {}}
                            />
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 py-4">
                    <div className="rounded-3xl border border-white/10 bg-black/35 p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-black">Tactical Briefing</div>
                      <p className="mt-3 text-sm leading-7 text-slate-200">{currentDrill.lesson}</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/35 p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-black">Context Tags</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-lg border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 font-black">{currentDrill.chapter}</span>
                        <span className="rounded-lg border border-cyan-400/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200 font-black">{currentDrill.skill}</span>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* CONSOLIDATED MISSION CONSOLE */}
            <div id="drills-mission-console" className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              
              <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#0a0f18]/90 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
                
                {/* LEFT: CLARA AI DECK & INTEL */}
                <div id="drills-clara-panel" className="lg:col-span-7 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-10 border-b lg:border-b-0 lg:border-r border-white/5 font-black">
                  <div className="relative shrink-0 flex flex-col items-center">
                    {/* Futuristic Card Frame */}
                    <div className="relative group/clara w-32 h-48 sm:w-44 sm:h-64 rounded-[2rem] overflow-hidden bg-gradient-to-b from-cyan-500/15 via-[#0a0f18] to-[#0a0f18] border border-cyan-400/20 shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all duration-500 group-hover:border-cyan-400/40 font-black">
                      {/* Scanline Effect */}
                      <div className="absolute inset-0 pointer-events-none z-20">
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20" />
                         <div className="absolute inset-0 bg-cyan-400/5 animate-[holographic-scan_6s_linear_infinite]" />
                      </div>
                      
                      {/* Clara Avatar (Centered) */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img 
                          src={claraImageSrc} 
                          alt="Clara" 
                          className="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-transform duration-700 group-hover/clara:scale-105" 
                        />
                      </div>
                      
                      {/* Status Indicators */}
                      <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-1 z-20">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10">
                          <div className={`h-1.5 w-1.5 rounded-full ${claraSpeaking ? 'bg-cyan-400' : 'bg-slate-500'} animate-pulse`} />
                          <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/70">Neural Link: {claraSpeaking ? 'Active' : 'Standby'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                      <button type="button" onClick={handlePlayClaraVoice} className="w-full group/voice relative overflow-hidden rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3.5 transition-all hover:bg-cyan-500/10 hover:border-cyan-400/40">
                        <div className="flex items-center justify-center gap-3">
                          {voiceLoading || claraSpeaking ? <Volume2 className="h-4 w-4 text-cyan-400 animate-pulse" /> : <Play className="h-4 w-4 text-slate-400 group-hover/voice:text-cyan-400 font-black" />}
                          <div className="flex flex-col items-start leading-none font-black text-white uppercase tracking-[0.1em]">
                            <span className="text-[10px] tracking-widest">Audio Sync</span>
                            <span className="mt-1 text-[7px] opacity-40">{claraSpeaking ? 'Transmitting' : 'Play Brief'}</span>
                          </div>
                        </div>
                      </button>
                      <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={toggleClaraMute}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                              claraMuted
                                ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                                : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:text-white'
                            }`}
                            aria-label={claraMuted ? 'Unmute Clara' : 'Mute Clara'}
                          >
                            {claraMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                              <span>Clara volume</span>
                              <span>{Math.round(claraVolume * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={Math.round(claraVolume * 100)}
                              onChange={(event) => setClaraVolume(Math.max(0, Math.min(1, Number(event.target.value) / 100)))}
                              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 font-black">{currentDrill.chapter}</span>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black uppercase tracking-widest text-cyan-400 font-black">{currentDrill.skill}</span>
                      </div>
                      
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-tight font-black opacity-80">{currentDrill.title}</h2>
                      <p className="mt-2 text-[11px] font-medium text-slate-400 leading-relaxed italic">{currentDrill.subtitle}</p>

                      <div className="mt-6 space-y-4">
                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner ring-1 ring-white/5">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 font-black">Objective</div>
                          <p className="text-[17px] sm:text-[20px] font-black text-white leading-relaxed tracking-tight">{currentDrill.prompt}</p>
                        </div>

                        <div className="relative p-4 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden opacity-60">
                          <div className="absolute top-0 left-0 w-1 h-full bg-slate-500/20" />
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 font-black">Briefing</div>
                          <p className="text-xs leading-6 text-slate-300 font-medium">{currentDrill.lesson}</p>
                        </div>
                      </div>
                    </div>

                    {revealed && (
                      <div className="mt-6 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="flex gap-3 items-start">
                          <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${selectedAnswer === currentDrill.correctAnswer ? 'bg-emerald-400' : 'bg-rose-400'} font-black`} />
                          <p className={`text-[12px] leading-relaxed font-black italic ${selectedAnswer === currentDrill.correctAnswer ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {selectedAnswer === currentDrill.correctAnswer ? currentDrill.successText : currentDrill.mistakeText}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT: COMMANDS */}
                <div id="drills-answer-grid" className="lg:col-span-5 bg-black/40 p-6 sm:p-8 flex flex-col relative min-h-[300px] font-black">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 font-black">Execution Grid</div>
                    <div className="h-px flex-1 mx-4 bg-white/5 font-black" />
                    <div className="text-[10px] font-black tracking-widest text-white/20 font-black truncate">SVAROG-OS</div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 flex-1 overflow-y-auto pr-1">
                    {currentDrill.options.map((option) => {
                      const isChosen = selectedAnswer === option;
                      const isCorrect = currentDrill.correctAnswer === option;
                      const showState = revealed && (isChosen || isCorrect);
                      
                      let appearance = "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white";
                      if (showState && isCorrect) appearance = "border-emerald-500/50 bg-emerald-500/20 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/30 font-black";
                      else if (isChosen && !isCorrect) appearance = "border-rose-500/50 bg-rose-500/10 text-rose-100 font-black grayscale-0";
                      else if (revealed) appearance = "border-white/5 bg-transparent text-slate-600 opacity-40 grayscale pointer-events-none";

                      return (
                        <button
                          key={option}
                          onClick={() => handleReveal(option)}
                          disabled={revealed}
                          className={`group relative w-full rounded-2xl border p-4 sm:p-5 flex items-center justify-between text-left transition-all duration-300 ${appearance} font-black`}
                        >
                          <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.15em] leading-tight font-black">
                            {option}
                          </span>
                          
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                            showState && isCorrect ? 'border-emerald-400 bg-emerald-400' : 
                            isChosen && !isCorrect ? 'border-rose-400 bg-rose-400' : 
                            'border-white/10 group-hover:border-white/30'
                          }`}>
                            {(showState && isCorrect) && <ShieldCheck className="h-3.5 w-3.5 text-emerald-950 font-black" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* RESOLVED OVERLAY */}
                  {revealed && (
                    <div className="absolute inset-x-0 bottom-0 top-[unset] lg:inset-0 z-40 flex items-end lg:items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
                      <div className="absolute inset-0 bg-[#080b12]/95 backdrop-blur-md" />
                      <div className="relative w-full max-w-sm text-center">
                        <div className={`text-[14px] font-black uppercase tracking-[0.4em] mb-8 drop-shadow-2xl ${selectedAnswer === currentDrill.correctAnswer ? 'text-emerald-400' : 'text-rose-400'} font-black`}>
                          {selectedAnswer === currentDrill.correctAnswer ? 'Data Match' : 'Neural Link Break'}
                        </div>
                        
                        <button
                          onClick={handleNext}
                          className="w-full relative group/btn"
                        >
                          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover/btn:opacity-60 transition duration-500"></div>
                          <div className="relative flex items-center justify-center gap-3 rounded-2xl bg-white py-5 px-8 text-[#080b12] font-black uppercase tracking-[0.25em] text-[12px] transition-all hover:scale-[1.03] active:scale-95 shadow-2xl font-black">
                            {currentIndex + 1 >= drills.length ? 'Finalize mission' : 'Advance Feed'}
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
