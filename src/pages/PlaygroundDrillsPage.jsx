import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, ChevronRight, Play, RefreshCw, ShieldCheck, Volume2 } from 'lucide-react';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernSessionTable from '../components/modern/ModernSessionTable';
import { translateTo4 } from '../utils/stringHelpers';
import { withBaseUrl } from '../utils/assetPaths';
import { useAuth } from '../hooks/useAuth';
import { usePvpSeasonStats } from '../hooks/usePvpSeasonStats';
import { buildApiUrl } from '../utils/apiBase';
import { DRILLS_QUESTION_BANK } from '../data/drillsQuestionBank';

const DRILLS_TOUR_STORAGE_KEY = 'svarog-drills-tour-v1';
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
    target: '#drills-clara-panel',
    title: 'Clara assist',
    body: 'This is your guided lesson panel. The question is the goal, Clara is the explanation, and the replay button lets you hear the lesson again whenever you want.',
    placement: 'right',
  },
  {
    target: '#drills-answer-grid',
    title: 'Answer grid',
    body: 'Choose one answer, read the feedback, then continue. Correct and mistake voices only trigger after you commit to an answer.',
    placement: 'left',
  },
  {
    target: '#drills-clara-panel',
    title: 'Ready outer',
    body: 'That is the full flow. Clara will now hand control back to the live drill sequence so the first lesson can begin properly.',
    placement: 'right',
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
  const claraBubbleText = !revealed
    ? (currentDrill?.lesson || 'Read the pattern first.')
    : (selectedAnswer === currentDrill?.correctAnswer
      ? currentDrill?.successText || 'Perfect. That is the right read.'
      : currentDrill?.mistakeText || 'Not quite. Check the clue you missed.');
  const claraImageSrc = claraSpeaking
    ? withBaseUrl('clara-prof-OandMouth.gif')
    : (revealed && selectedAnswer !== currentDrill?.correctAnswer
      ? withBaseUrl('clara-prof-assistant-sadface.png')
      : withBaseUrl('clara-prof-assistant.png'));

  const stopClaraAudio = () => {
    if (!claraAudioRef.current) return;
    claraAudioRef.current.pause();
    claraAudioRef.current.currentTime = 0;
    claraAudioRef.current = null;
    setClaraSpeaking(false);
    setVoiceLoading(false);
    setActiveVoicePath('');
  };

  const playClaraAudio = (audioPath) => {
    if (!audioPath) return;
    stopClaraAudio();

    const audio = new Audio(encodeURI(withBaseUrl(audioPath)));
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
    <div className={`playground-theme-shell min-h-screen bg-[#080b12] px-4 py-8 text-slate-200 md:px-8 [&_button:not(:disabled)]:cursor-pointer ${themeConfig.rootClassName || ''} flex flex-col`}>
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
                      {/* Tooltip */}
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
            <div className="mb-2 text-[12px] font-black uppercase tracking-[0.4em] text-emerald-400 drop-shadow-md">Drill Sequence Cleared</div>
            <h2 className="text-5xl font-black uppercase tracking-tight text-white drop-shadow-lg">Rank: Tactical Expert</h2>
            <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-slate-400 font-semibold tracking-wider">
              You've successfully analyzed the core patterns. The simulator logic is now unlocked. Time to step into the real challenges.
            </p>

            <div className="mt-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-black/35 p-5 text-left shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Season Progress
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">
                    {progressionSummary ? `+${progressionSummary.xpGained || 0} XP${Number(progressionSummary.tokensGained || 0) > 0 ? ` · +${progressionSummary.tokensGained} tokens` : ""}` : (progressionSyncing ? 'Syncing...' : 'No XP logged')}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-right">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Season level</div>
                  <div className="mt-1 text-lg font-black text-white">
                    {progressionSummary ? `Lv ${progressionSummary.levelAfter || 1}` : '--'}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
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
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Reward status</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {progressionSummary
                    ? Array.isArray(progressionSummary.unlockedRewards) && progressionSummary.unlockedRewards.length > 0
                      ? `${progressionSummary.unlockedRewards[0].name} unlocked`
                      : progressionSummary.nextReward
                        ? `${progressionSummary.nextReward.xpRemaining} XP left to ${progressionSummary.nextReward.name}`
                        : 'No pending reward from this clear'
                    : (progressionSyncing ? 'Checking reward unlocks...' : 'No progression update available')}
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/playground/challenge')}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-amber-400/50 bg-amber-500/20 px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-amber-100 transition-all hover:bg-amber-500/30 hover:shadow-[0_0_30px_rgba(251,191,36,0.3)]"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
                <span className="relative z-10 flex items-center gap-2">
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
               {/* Player / XP Bar */}
               {(() => {
                 const liveProgression = progressionSummary || seasonData?.profile?.progression;
                 const liveLevel = liveProgression?.levelProgress?.level ?? seasonData?.profile?.levelProgress?.level ?? 1;
                 const liveXp = liveProgression?.levelProgress?.currentLevelXp ?? liveProgression?.currentLevelXp ?? 0;
                 const liveNextXp = liveProgression?.levelProgress?.nextLevelXp ?? liveProgression?.nextLevelXp ?? 0;
                 const livePct = liveProgression?.levelProgress?.progressPercent ?? liveProgression?.progressPercent ?? (score / drills.length) * 100;
                 const drillsCleared = liveProgression?.practiceSummary?.drillsClears ?? 0;
                 const nextReward = liveProgression?.nextReward ?? progressionSummary?.nextReward ?? null;
                 const newReward = Array.isArray(progressionSummary?.unlockedRewards) && progressionSummary.unlockedRewards.length > 0
                   ? progressionSummary.unlockedRewards[0]
                   : null;
                 const xpGained = Number(progressionSummary?.xpGained || 0);
                 const tokensGained = Number(progressionSummary?.tokensGained || 0);
                 return (
                   <div className="flex flex-col flex-1 max-w-[240px]">
                     <div className="flex justify-between items-end mb-1">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Player</span>
                       <span className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-500/80">
                         Lv {progressionSummary ? (progressionSummary.levelAfter || 1) : liveLevel}
                       </span>
                     </div>
                     <div className="h-2 w-full bg-black/60 border border-emerald-500/20 rounded-full overflow-hidden shadow-inner">
                       <div
                         className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-700 ease-out"
                         style={{ width: `${Math.max(0, Math.min(100, livePct || 0))}%` }}
                       />
                     </div>
                     <span className="text-[8px] uppercase font-black tracking-[0.15em] mt-1.5 text-slate-500">
                       Score {score}/{drills.length}
                     </span>
                     {xpGained > 0 || tokensGained > 0 ? (
                       <span className="mt-1 text-[8px] uppercase font-black tracking-[0.15em] text-emerald-300">
                         +{xpGained} XP this clear{tokensGained > 0 ? ` | +${tokensGained} tokens` : ""}
                       </span>
                     ) : liveNextXp > 0 ? (
                       <span className="mt-1 text-[8px] uppercase font-black tracking-[0.15em] text-slate-500">
                         {liveXp}/{liveNextXp} level XP
                       </span>
                     ) : null}
                     {newReward ? (
                       <span className="mt-1 text-[8px] uppercase font-black tracking-[0.15em] text-cyan-300">
                         {newReward.name} added to your account
                       </span>
                     ) : nextReward ? (
                       <span className="mt-1 text-[8px] uppercase font-black tracking-[0.15em] text-slate-500">
                         {nextReward.xpRemaining} XP to {nextReward.name}
                       </span>
                     ) : drillsCleared > 0 ? (
                       <span className="mt-1 text-[8px] uppercase font-black tracking-[0.15em] text-slate-500">
                         {drillsCleared} cleared this season
                       </span>
                     ) : null}
                   </div>
                 );
               })()}
               
               {/* Opponent / Encounter Info */}
               <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-rose-500 border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(244,63,94,0.2)] mb-1.5">
                     Rival: Drill {String(currentIndex + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white drop-shadow-md text-right leading-none max-w-[300px] sm:max-w-none">
                     {currentDrill.title}
                  </span>
               </div>
            </div>

            {/* THE BATTLEFIELD (Predictor & Session) */}
            <div id="drills-sensor-feed" className="relative rounded-[2rem] border border-white/5 bg-gradient-to-b from-slate-900/60 to-slate-950/80 p-5 sm:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-white/5">
                {/* Background Details */}
                <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-cyan-500/5 blur-[100px] rounded-full" />
                   <div className="absolute top-[-10%] right-[-5%] text-[150px] font-black italic tracking-tighter text-white/[0.02] leading-none select-none">
                      {String(currentIndex + 1).padStart(2, '0')}
                   </div>
                </div>

                {hasPredictorContext ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                     <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                           <BrainCircuit className="h-4 w-4 text-cyan-400" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 drop-shadow-md">Predictor Matrix</span>
                        </div>
                        <div className="rounded-[1.25rem] border border-white/10 bg-black/40 overflow-hidden shadow-inner">
                           <ModernPairPredictorCard entries={currentEntries} region="America" />
                        </div>
                     </div>

                     <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 drop-shadow-md pb-1 border-b border-cyan-400/30">Session Data</span>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="rounded-3xl border border-white/10 bg-black/35 p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Clara brief
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-200">
                        {currentDrill.lesson}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/35 p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Scenario notes
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-lg border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                          {currentDrill.chapter}
                        </span>
                        <span className="rounded-lg border border-cyan-400/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                          {currentDrill.skill}
                        </span>
                        <span className="rounded-lg border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                          {currentDrill.options.length} answers
                        </span>
                      </div>
                      <p className="mt-4 text-xs leading-6 text-slate-400">
                        This drill is teaching system vocabulary rather than replaying a live roll snapshot. Read Clara's lesson, then answer from the prompt.
                      </p>
                    </div>
                  </div>
                )}
            </div>

            {/* DIALOGUE & MOVES PANE */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch relative">
               
               {/* Dialogue Box - WITH CLARA ASSISTANT */}
               <div id="drills-clara-panel" className="md:col-span-7 theme-glass-card force-overflow-visible rounded-[2.5rem] bg-transparent backdrop-blur-md p-6 group relative overflow-visible shadow-[0_0_50px_rgba(0,0,0,0.35)] flex items-stretch gap-5 sm:gap-7 border-[3px] border-double border-cyan-400/30">
                  <style dangerouslySetInnerHTML={{
                    __html: `
                    .force-overflow-visible { overflow: visible !important; }
                  `}} />
                  {/* CLARA AVATAR & BUBBLE CONTAINER */}
                  <div className="relative shrink-0 w-[112px] sm:w-[140px] flex flex-col items-center justify-end z-[120]">
                     <div className="absolute inset-x-0 bottom-6 h-32 rounded-full bg-cyan-500/12 blur-[45px] opacity-80" />
                     <div className="relative w-full rounded-[1.5rem] border border-white/10 bg-black/25 px-3 pt-3 pb-2 backdrop-blur-md">
                        <div className="mb-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                          Clara assist
                        </div>
                     <img
                       src={claraImageSrc}
                       alt="Clara Assistant Icon"
                       className="relative mx-auto w-[130%] max-w-none -ml-4 object-contain z-10 drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                       style={{
                         maskImage: 'linear-gradient(to bottom, black 0%, black 68%, rgba(0,0,0,0.85) 78%, rgba(0,0,0,0.35) 90%, transparent 100%), linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)',
                         WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 68%, rgba(0,0,0,0.85) 78%, rgba(0,0,0,0.35) 90%, transparent 100%), linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)',
                       }}
                     />
                     </div>
                  </div>

                  {/* TEXT AREA */}
                  <div className="flex-1 flex flex-col justify-center relative z-20 mt-2">
                     <div className="flex flex-wrap items-center justify-between gap-3">
                       <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-400 border border-cyan-500/30 rounded px-1.5 py-0.5 inline-block self-start shadow-sm bg-cyan-500/10 backdrop-blur-sm">
                           {currentDrill.chapter}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-300 border border-white/10 rounded px-1.5 py-0.5 inline-block">
                           {currentDrill.skill}
                        </span>
                       </div>
                       <button
                         type="button"
                         onClick={handlePlayClaraVoice}
                         className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition-all hover:border-cyan-300 hover:bg-cyan-500/18 hover:text-white"
                       >
                         {voiceLoading || claraSpeaking ? <Volume2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                         {voiceLoading ? 'Loading voice' : (claraSpeaking ? 'Playing Clara' : 'Hear Clara')}
                       </button>
                     </div>
                     <h2 className="mt-4 text-xl font-black uppercase tracking-tight text-white">
                        {currentDrill.title}
                     </h2>
                     <p className="mt-1 text-xs leading-6 text-slate-400">
                        {currentDrill.subtitle}
                     </p>
                     {currentDrill.scenarioTags?.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {currentDrill.scenarioTags.map((tag) => (
                            <span
                              key={`${tag.label}-${tag.value}`}
                              className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-amber-100"
                            >
                              {tag.label}: {tag.value}
                            </span>
                          ))}
                        </div>
                     ) : null}
                     <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                       <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                         Question
                       </div>
                       <p className="mt-2 text-[16px] sm:text-[18px] leading-8 text-white font-semibold">
                          {currentDrill.prompt}
                       </p>
                     </div>
                     <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.04] p-4">
                       <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                         Clara lesson
                       </div>
                       <p className="mt-2 text-sm leading-7 text-slate-200">
                         {currentDrill.lesson}
                       </p>
                     </div>
                     {revealed && (
                        <div className="mt-4 border-t border-cyan-500/20 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                           <p className="text-[11px] leading-relaxed italic text-cyan-100/80">
                              {selectedAnswer === currentDrill.correctAnswer ? currentDrill.successText : currentDrill.mistakeText}
                           </p>
                        </div>
                     )}
                  </div>
               </div>

               {/* Action/Moves Grid */}
               <div id="drills-answer-grid" className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 relative min-h-[150px]">
                  {currentDrill.options.map((option, idx) => {
                    const isChosen = selectedAnswer === option;
                    const isCorrect = currentDrill.correctAnswer === option;
                    const showState = revealed && (isChosen || isCorrect);
                    
                    let btnStyle = "border-white/10 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:border-white/30 hover:scale-[1.03]";
                    
                    if (showState && isCorrect) {
                       btnStyle = "border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400 scale-[1.02] z-10";
                    } else if (isChosen && !isCorrect) {
                       btnStyle = "border-rose-500 bg-rose-500/20 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.2)]";
                    } else if (revealed) {
                       btnStyle = "border-white/5 bg-black/40 text-slate-600 opacity-50 cursor-not-allowed";
                    }

                    return (
                      <button
                        key={option}
                        onClick={() => handleReveal(option)}
                        disabled={revealed}
                        className={`group relative rounded-xl border p-3 flex items-center justify-center text-center font-black uppercase tracking-[0.14em] text-[9.5px] transition-all duration-300 ${btnStyle}`}
                      >
                         {/* Optional subtle accent triangle usually seen in game menus */}
                         <div className={`absolute top-2 left-2 w-0 h-0 border-t-4 border-r-4 border-t-current border-r-transparent opacity-20 ${showState ? 'opacity-50' : 'group-hover:opacity-100'}`} />
                         {option}
                      </button>
                    );
                  })}

                  {/* Next Step Overlay - Pops up over options when resolved */}
                  {revealed && (
                     <div className="absolute inset-0 z-20 flex items-center justify-center animate-in zoom-in-95 duration-500 rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />
                        <div className="relative text-center w-full px-4">
                           <div className={`text-[12px] font-black uppercase tracking-[0.25em] mb-4 drop-shadow-[0_0_10px_currentColor] ${selectedAnswer === currentDrill.correctAnswer ? 'text-emerald-400' : 'text-rose-400'}`}>
                             {selectedAnswer === currentDrill.correctAnswer ? 'Critical Hit!' : 'It Was Ineffective...'}
                           </div>
                           <button
                             onClick={handleNext}
                             className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 py-3.5 px-4 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-cyan-300 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] ring-2 ring-white/50"
                           >
                             {currentIndex + 1 >= drills.length ? 'Victory' : 'Continue'} <ChevronRight className="h-4 w-4" />
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

