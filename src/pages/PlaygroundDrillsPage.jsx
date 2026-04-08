import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, ChevronRight, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { predictWithPairs } from '../utils/pairTransitionPredictor';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernSessionTable from '../components/modern/ModernSessionTable';
import { translateTo4 } from '../utils/stringHelpers';
import { withBaseUrl } from '../utils/assetPaths';
import { useAuth } from '../hooks/useAuth';
import { usePvpSeasonStats } from '../hooks/usePvpSeasonStats';
import { buildApiUrl } from '../utils/apiBase';

const ALL_PAIRS = [
  ['41', '42'],
  ['41', '43'],
  ['41', '44'],
  ['42', '43'],
  ['42', '44'],
  ['43', '44'],
];

const DRILL_DEFS = [
  {
    id: 'commons-read',
    chapter: 'Predictor Basics',
    title: 'Read The Commons',
    subtitle: 'Pick the pair you should read first.',
    skill: 'Pair Reading',
    starterRolls: ['41', '41', '41', '44', '41', '41'],
    type: 'commons',
    explanation:
      'When one value clearly dominates and one partner keeps returning with it, you start from the commons pair instead of guessing at outsiders.',
  },
  {
    id: 'noise-spot',
    chapter: 'Predictor Basics',
    title: 'Spot The Noise',
    subtitle: 'Which side is interrupting the lane?',
    skill: 'Noise Awareness',
    starterRolls: ['42', '43', '42', '43', '44', '42'],
    type: 'noise',
    explanation:
      'A readable board can still have a trap side. Noise tells you what is trying to break the lane.',
  },
  {
    id: 'dominant-roll-read',
    chapter: 'Session Reading',
    title: 'Find The Dominant Roll',
    subtitle: 'Which value is really running the board?',
    skill: 'Dominant Roll',
    starterRolls: ['41', '41', '41', '41', '44', '41'],
    type: 'decision',
    prompt: 'Which roll is dominant in this session snapshot?',
    answer: '41',
    options: ['41', '42', '44'],
    explanation:
      'Dominant does not mean perfect. It means one value is doing most of the work even if a break appears once.',
  },
  {
    id: 'how-many-times-runs',
    chapter: 'Session Reading',
    title: 'Count The Lane',
    subtitle: 'Read how long a streak actually ran.',
    skill: 'Lane Counting',
    starterRolls: ['44', '44', '44', '44', '42', '44'],
    type: 'decision',
    prompt: 'Before the 42 break, how many times did 44 run in a row?',
    answer: '4',
    options: ['3', '4', '5'],
    explanation:
      'Counting streak length matters because long dominance behaves differently from a tiny accidental streak.',
  },
  {
    id: 'chaotic-session-read',
    chapter: 'Session Reading',
    title: 'What Is A Chaotic Session?',
    subtitle: 'Know the difference between readable and messy.',
    skill: 'Chaos Reading',
    starterRolls: ['41', '44', '42', '43', '44', '41'],
    type: 'decision',
    prompt: 'Why does this snapshot read as chaotic instead of clean?',
    answer: 'All four values are active and the lane keeps changing',
    options: [
      'All four values are active and the lane keeps changing',
      'Because one value appears three times',
      'Because chaos means the same value repeats',
    ],
    explanation:
      'Chaotic boards use many values and shift the lane often. They do not hand you one simple safe pair right away.',
  },
  {
    id: 'sequence-session-read',
    chapter: 'Session Reading',
    title: 'What Is A Sequence Session?',
    subtitle: 'Some boards move with rhythm instead of one-value dominance.',
    skill: 'Sequence Reading',
    starterRolls: ['42', '43', '42', '43', '42', '43'],
    type: 'decision',
    prompt: 'What makes this feel like a sequence session?',
    answer: 'The board is repeating a readable alternating rhythm',
    options: [
      'The board is repeating a readable alternating rhythm',
      'One outsider appeared once',
      'The board has no pattern at all',
    ],
    explanation:
      'Sequence sessions are about repeatable rhythm and transitions, not only one value dominating forever.',
  },
  {
    id: 'session-history-read',
    chapter: 'Session Reading',
    title: 'Read Session History',
    subtitle: 'Use the last entries, not vibes.',
    skill: 'History Reading',
    starterRolls: ['41', '41', '42', '41', '41', '44', '41', '41'],
    type: 'decision',
    prompt: 'What should you trust first here: the repeated 41 lane or the single 44 outsider?',
    answer: 'The repeated 41 lane',
    options: ['The repeated 41 lane', 'The single 44 outsider', 'Neither, because one break deletes the history'],
    explanation:
      'History gives context. The right read usually starts from what kept happening, not the one loud interruption.',
  },
  {
    id: 'trend-share-meaning',
    chapter: 'Predictor Basics',
    title: 'What Is Trend Share?',
    subtitle: 'Read the visible percent correctly.',
    skill: 'Trend Share',
    type: 'decision',
    prompt: 'In the predictor, what does “trend share 40%” mean?',
    answer: 'That value owned 40% of the latest trend window',
    options: [
      'That value owned 40% of the latest trend window',
      'The predictor is 40% sure the value is correct',
      'The value will repeat 40% of the rest of the session',
    ],
    explanation:
      'Trend share is just recent ownership of the window. It is not the same thing as confidence.',
  },
  {
    id: 'trust-meaning',
    chapter: 'Predictor Basics',
    title: 'What Is Trust?',
    subtitle: 'Trust is not the same thing as share.',
    skill: 'Trend Trust',
    type: 'decision',
    prompt: 'What does “trust 100%” actually mean?',
    answer: 'The predictor strongly believes the arrow direction itself',
    options: [
      'The predictor strongly believes the arrow direction itself',
      'That value appeared in 100% of the recent rolls',
      'The board is safe and cannot break',
    ],
    explanation:
      'Trust is internal confidence in the direction label like rising, stable, or falling. It is not the same as visible frequency.',
  },
  {
    id: 'freshness-meaning',
    chapter: 'Predictor Basics',
    title: 'What Is Freshness?',
    subtitle: 'Freshness tells you how new the arrow is.',
    skill: 'Freshness',
    type: 'decision',
    prompt: 'What does freshness measure in the predictor?',
    answer: 'How recently that same arrow changed or stayed alive',
    options: [
      'How recently that same arrow changed or stayed alive',
      'How many total times the value appeared this session',
      'How much junk the relic currently has',
    ],
    explanation:
      'Freshness is timing. It helps you tell a new push apart from an old signal that has been hanging around for several windows.',
  },
  {
    id: 'fresh-held-stale',
    chapter: 'Predictor Basics',
    title: 'Fresh, Held, Or Stale?',
    subtitle: 'Know what the state label is trying to tell you.',
    skill: 'Freshness State',
    type: 'decision',
    prompt: 'If an arrow has repeated for multiple windows without changing, what should the predictor call it?',
    answer: 'Stale',
    options: ['Fresh', 'Held', 'Stale'],
    explanation:
      'Fresh means new. Held means it kept going for another window. Stale means the same arrow has been around long enough that you should start watching for a break.',
  },
  {
    id: 'share-vs-trust-example',
    chapter: 'Predictor Basics',
    title: 'Share vs Trust',
    subtitle: 'Use both numbers together.',
    skill: 'Trend Interpretation',
    type: 'decision',
    prompt: 'Which read is stronger: share 40% + trust 100% + fresh, or share 40% + trust 100% + stale?',
    answer: 'The fresh one is stronger',
    options: [
      'The fresh one is stronger',
      'They are exactly the same read',
      'The stale one is stronger because it lasted longer',
    ],
    explanation:
      'Equal share does not mean equal timing. Freshness helps you tell whether the signal is newly pushing or just lingering.',
  },
  {
    id: 'carry-line-read',
    chapter: 'Carry Line',
    title: 'Read The Sitting Line',
    subtitle: 'The board only makes sense if you know where you are sitting.',
    skill: 'Carry Line',
    type: 'decision',
    prompt: 'You just hit line 3 on a relic. Before the next roll, what line are you sitting on?',
    answer: 'Line 3',
    options: ['Line 1', 'Line 2', 'Line 3'],
    explanation:
      'Your sitting line is where the last hit left you. If you forget that, all raw-pair and force decisions start from the wrong place.',
  },
  {
    id: 'line-helper-hit-slot-4',
    chapter: 'Line Helper',
    title: 'Pick The Winning Pair',
    subtitle: 'Use the helper, then choose the right raw pair.',
    skill: 'Line Helper',
    type: 'decision',
    prompt: 'If the next visible roll is 41 and you want to land on slot 4, which raw pair wins?',
    answer: '34',
    options: ['34', '24', '14', '44'],
    explanation:
      'For a visible roll of 41, the helper path is 12 / 23 / 34 / 41. To land on slot 4, the winning raw pair is 34.',
  },
  {
    id: 'raw-pair-translate-42',
    chapter: 'Translation',
    title: 'Translate The Pair',
    subtitle: 'Know the Caesar-style conversion, not just the visible roll.',
    skill: 'Raw Pair Translation',
    type: 'decision',
    prompt: 'What visible roll does raw pair 23 translate into?',
    answer: '41',
    options: ['41', '42', '43'],
    explanation:
      'The hidden raw pair matters because it tells you which previous line and target slot created the visible roll.',
  },
  {
    id: 'what-is-13',
    chapter: 'Translation',
    title: 'What 13 Means',
    subtitle: 'Raw pairs tell a full story, not just a value.',
    skill: 'Raw Pair Meaning',
    type: 'decision',
    prompt: 'What does raw pair 13 mean?',
    answer: 'You were on line 1 and landed on slot 3',
    options: [
      'You were on line 1 and landed on slot 3',
      'You were on slot 1 and the next roll became 3',
      'It means the board is on line 13',
    ],
    explanation:
      'The first number is the line you came from. The second number is the slot you landed on.',
  },
  {
    id: 'what-is-caesar-shift',
    chapter: 'Translation',
    title: 'What Is Caesar Shift?',
    subtitle: 'Why raw pairs become visible 4x rolls.',
    skill: 'Caesar Shift',
    type: 'decision',
    prompt: 'In this system, what does Caesar shift help you do?',
    answer: 'Convert hidden raw pairs like 23 into the visible 4x roll language',
    options: [
      'Convert hidden raw pairs like 23 into the visible 4x roll language',
      'Force the board into line 4 automatically',
      'Rank relics by score tier',
    ],
    explanation:
      'The shift is the translation layer between hidden pair logic and the visible roll language players actually see.',
  },
  {
    id: 'slot-targeting-43',
    chapter: 'Translation',
    title: 'Hit Slot 1 On 43',
    subtitle: 'Work backward from the visible roll into the right raw pair.',
    skill: 'Slot Targeting',
    type: 'decision',
    prompt: 'If the next visible roll is 43 and you want slot 1, which raw pair should you choose?',
    answer: '21',
    options: ['14', '21', '32', '43'],
    explanation:
      'For 43, the full helper path is 14 / 21 / 32 / 43. To land on slot 1, you need raw pair 21.',
  },
  {
    id: 'line-two-force',
    chapter: 'Force Lines',
    title: 'Force Line 2',
    subtitle: 'Know which relic count sits you on line 2.',
    skill: 'Line Forcing',
    type: 'force',
    prompt: 'You want to sit on line 2 before the next real hit. Which relic do you use?',
    answer: '1-liner',
    options: ['1-liner', '2-liner', '3-liner'],
    explanation:
      'A 1-line relic forces line 2. This is the simplest force mapping in the whole system.',
  },
  {
    id: 'line-three-force',
    chapter: 'Force Lines',
    title: 'Force Line 3',
    subtitle: 'Line 3 has its own basic force mapping too.',
    skill: 'Line Forcing',
    type: 'force',
    prompt: 'You want to sit on line 3 before the next real hit. Which relic do you use?',
    answer: '2-liner',
    options: ['1-liner', '2-liner', '3-liner'],
    explanation:
      'A 2-line relic forces line 3. This is one of the most common practical detours.',
  },
  {
    id: 'next-step-setup',
    chapter: 'Planning',
    title: 'Set Up The Next Hit',
    subtitle: 'Sometimes this turn is about the next turn.',
    skill: 'Next-Step Planning',
    type: 'decision',
    prompt: 'If the next visible roll is 42 and the stat you want is on slot 3, what line do you want to be sitting on first?',
    answer: 'Line 1',
    options: ['Line 1', 'Line 2', 'Line 4'],
    explanation:
      'For roll 42, slot 3 comes from raw pair 13. That means you need to be sitting on line 1 before the real hit.',
  },
  {
    id: 'builder-session-basics',
    chapter: 'Builder Session',
    title: 'Build Data First',
    subtitle: 'Do not guess with no history.',
    skill: 'Builder Basics',
    type: 'decision',
    prompt: 'If the session window is basically empty, what should you usually do first?',
    answer: 'Use the builder relic to create readable session data',
    options: [
      'Use the builder relic to create readable session data',
      'Immediately slam the target relic',
      'Keep waiting without clicking anything',
    ],
    explanation:
      'Builder exists to create readable history. With no data, most advanced reads are just guessing.',
  },
];

function pairKey(pair = []) {
  return pair.join(' / ');
}

function uniqueOptions(list = []) {
  const seen = new Set();
  return list.filter((entry) => {
    if (seen.has(entry)) return false;
    seen.add(entry);
    return true;
  });
}

function hashString(value = '') {
  let hash = 0;
  const normalized = String(value || '');
  for (let index = 0; index < normalized.length; index += 1) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function shuffleOptions(list = [], seedKey = '') {
  const items = [...list];
  let seed = hashString(seedKey);
  for (let index = items.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function buildDrill(definition) {
  const prediction = definition.starterRolls
    ? predictWithPairs(definition.starterRolls, { region: 'America' })
    : null;

  if (definition.type === 'commons') {
    const trustedPair = Array.isArray(prediction?.trustedPair) && prediction.trustedPair.length === 2
      ? prediction.trustedPair
      : prediction?.commons || ['41', '42'];
    const correct = pairKey(trustedPair);
    const distractors = ALL_PAIRS
      .map(pairKey)
      .filter((entry) => entry !== correct)
      .slice(0, 3);

    return {
      ...definition,
      prediction,
      correctAnswer: correct,
      options: shuffleOptions(uniqueOptions([correct, ...distractors]).slice(0, 4), definition.id),
      prompt: definition.prompt || 'Which pair should you treat as the commons lane?',
    };
  }

  if (definition.type === 'noise') {
    const noisePair = Array.isArray(prediction?.noise) && prediction.noise.length > 0
      ? prediction.noise.slice(0, 2)
      : ['43', '44'];
    const correct = pairKey(noisePair);
    const distractors = ALL_PAIRS
      .map(pairKey)
      .filter((entry) => entry !== correct)
      .slice(0, 3);

    return {
      ...definition,
      prediction,
      correctAnswer: correct,
      options: shuffleOptions(uniqueOptions([correct, ...distractors]).slice(0, 4), definition.id),
      prompt: definition.prompt || 'Which values are acting like the noise side here?',
    };
  }

  return {
    ...definition,
    prediction,
    correctAnswer: definition.answer,
    options: shuffleOptions(definition.options || [], definition.id),
  };
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
  const drills = useMemo(() => DRILL_DEFS.map(buildDrill), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sessionTab, setSessionTab] = useState('current');
  const [claraSpeaking, setClaraSpeaking] = useState(false);
  const [progressionSummary, setProgressionSummary] = useState(null);
  const [progressionSyncing, setProgressionSyncing] = useState(false);
  const drillSessionKeyRef = React.useRef(`drills-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const loggedDrillSessionRef = React.useRef('');

  const currentDrill = drills[currentIndex];
  const isComplete = currentIndex >= drills.length;
  const currentEntries = useMemo(
    () => buildEntryRows(currentDrill?.starterRolls || []),
    [currentDrill]
  );
  const claraBubbleText = !revealed
    ? 'Read the pattern first.'
    : (selectedAnswer === currentDrill?.correctAnswer ? 'Perfect. That is the right read.' : 'Not quite. Check the clue you missed.');
  const claraImageSrc = claraSpeaking
    ? withBaseUrl('clara-prof-OandMouth.gif')
    : (revealed && selectedAnswer !== currentDrill?.correctAnswer
      ? withBaseUrl('clara-prof-assistant-sadface.png')
      : withBaseUrl('clara-prof-assistant.png'));

  useEffect(() => {
    setClaraSpeaking(true);
    const timer = window.setTimeout(() => {
      setClaraSpeaking(false);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [claraBubbleText]);

  const handleReveal = (answer) => {
    if (revealed || isComplete) return;
    const isCorrect = answer === currentDrill.correctAnswer;
    setSelectedAnswer(answer);
    setRevealed(true);
    setAnswers((current) => ({ ...current, [currentDrill.id]: { answer, correct: isCorrect } }));
    if (isCorrect) {
      setScore((current) => current + 1);
    }
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
        {/* TOP NAV PANE */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 md:border-none md:pb-0">
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
                    {progressionSummary ? `+${progressionSummary.xpGained || 0} XP` : (progressionSyncing ? 'Syncing...' : 'No XP logged')}
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
                  <span>Current level XP</span>
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
                       {liveNextXp > 0
                         ? `${liveXp}/${liveNextXp} season xp`
                         : `${drillsCleared} drills cleared`}
                     </span>
                     {newReward ? (
                       <span className="mt-1 text-[8px] uppercase font-black tracking-[0.15em] text-cyan-300">
                         {newReward.name} unlocked
                       </span>
                     ) : nextReward ? (
                       <span className="mt-1 text-[8px] uppercase font-black tracking-[0.15em] text-slate-500">
                         {nextReward.xpRemaining} xp to {nextReward.name}
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
            <div className="relative rounded-[2rem] border border-white/5 bg-gradient-to-b from-slate-900/60 to-slate-950/80 p-5 sm:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-white/5">
                {/* Background Details */}
                <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-cyan-500/5 blur-[100px] rounded-full" />
                   <div className="absolute top-[-10%] right-[-5%] text-[150px] font-black italic tracking-tighter text-white/[0.02] leading-none select-none">
                      {String(currentIndex + 1).padStart(2, '0')}
                   </div>
                </div>

                {currentEntries.length > 0 ? (
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
                  <div className="flex items-center justify-center min-h-[200px] relative z-10">
                     <span className="text-[12px] font-black uppercase tracking-widest text-slate-600">No Target Active</span>
                  </div>
                )}
            </div>

            {/* DIALOGUE & MOVES PANE */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch relative">
               
               {/* Dialogue Box - WITH CLARA ASSISTANT */}
               <div className="md:col-span-7 theme-glass-card force-overflow-visible rounded-[2.5rem] bg-transparent backdrop-blur-md p-6 group relative overflow-visible shadow-[0_0_50px_rgba(0,0,0,0.35)] flex items-stretch gap-4 sm:gap-6 border-[3px] border-double border-cyan-400/30">
                  <style dangerouslySetInnerHTML={{
                    __html: `
                    .force-overflow-visible { overflow: visible !important; }
                  `}} />
                  {/* CLARA AVATAR & BUBBLE CONTAINER */}
                  <div className="relative shrink-0 w-24 sm:w-32 flex flex-col justify-end mt-10 z-[120]">
                     <div className="absolute inset-0 rounded-full bg-cyan-500 blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
                     
                     {/* The speech bubble pointing to the dialogue text */}
                     <div className="absolute -top-20 md:-top-28 left-[60%] md:left-[70%] z-[130] animate-float-gentle select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105">
                        <div className="relative">
                           <svg width="270" height="92" viewBox="0 0 270 92" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[180px] md:w-[220px]">
                              <path
                                d="M10 38C10 18.1178 31.4903 2 58 2H212C238.51 2 260 18.1178 260 38C260 57.8822 238.51 74 212 74H78L44 90L54 74C29.5964 74 10 57.8822 10 38Z"
                                fill="white"
                                fillOpacity="0.95"
                                stroke="#0ea5e9"
                                strokeWidth="3"
                              />
                           </svg>
                           <div className="absolute inset-0 flex items-center justify-center pb-3 px-8 z-20">
                              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-tight text-center leading-[1.05]" style={{ color: '#000000' }}>
                                {claraBubbleText}
                              </span>
                           </div>
                        </div>
                     </div>
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-[130] w-full text-center pointer-events-none drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]">
                         <div className="text-[9px] font-black uppercase tracking-widest text-cyan-300 drop-shadow-md pb-1 border-b border-cyan-500/30 bg-black/40 px-2 rounded-t-xl inline-block backdrop-blur-sm">
                           Clara
                        </div>
                     </div>
                     <img
                       src={claraImageSrc}
                       alt="Clara Assistant Icon"
                       className="relative w-[140%] max-w-none -ml-4 object-contain z-10 drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                       style={{
                         maskImage: 'linear-gradient(to bottom, black 0%, black 68%, rgba(0,0,0,0.85) 78%, rgba(0,0,0,0.35) 90%, transparent 100%), linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)',
                         WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 68%, rgba(0,0,0,0.85) 78%, rgba(0,0,0,0.35) 90%, transparent 100%), linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)',
                       }}
                     />
                  </div>

                  {/* TEXT AREA */}
                  <div className="flex-1 flex flex-col justify-center relative z-20 mt-4 md:mt-2">
                     <span className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-400 border border-cyan-500/30 rounded px-1.5 py-0.5 mb-2 inline-block self-start shadow-sm bg-cyan-500/10 backdrop-blur-sm">
                        {currentDrill.skill} Review
                     </span>
                     <p className="text-[14px] sm:text-[16px] leading-relaxed text-white font-medium drop-shadow-sm">
                        {currentDrill.prompt}
                     </p>
                     {revealed && (
                        <div className="mt-4 border-t border-cyan-500/20 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                           <p className="text-[11px] leading-relaxed italic text-cyan-100/80">
                              {currentDrill.explanation}
                           </p>
                        </div>
                     )}
                  </div>
               </div>

               {/* Action/Moves Grid */}
               <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 relative min-h-[150px]">
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
