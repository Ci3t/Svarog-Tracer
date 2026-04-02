import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, ChevronRight, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { predictWithPairs } from '../utils/pairTransitionPredictor';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernSessionTable from '../components/modern/ModernSessionTable';
import { translateTo4 } from '../utils/stringHelpers';

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
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const drills = useMemo(() => DRILL_DEFS.map(buildDrill), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sessionTab, setSessionTab] = useState('current');

  const currentDrill = drills[currentIndex];
  const isComplete = currentIndex >= drills.length;
  const currentEntries = useMemo(
    () => buildEntryRows(currentDrill?.starterRolls || []),
    [currentDrill]
  );

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
    setCurrentIndex(0);
    setSelectedAnswer('');
    setRevealed(false);
    setScore(0);
    setAnswers({});
    setSessionTab('current');
  };

  return (
    <div className={`min-h-screen bg-[#080B14] px-4 py-10 text-slate-200 md:px-6 [&_button:not(:disabled)]:cursor-pointer ${themeConfig.rootClassName || ''}`}>
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/playground')}
              className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back To Playground
            </button>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Beginner Friendly</div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-white">Beginner Drills</h1>
            </div>
          </div>

          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/50 px-4 py-2">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
              Score {score} / {drills.length}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-[1.35rem] border border-white/5 bg-slate-950/45 p-5">
          <div className="mb-3 flex items-center gap-2 text-emerald-200">
            <Sparkles className="h-4 w-4" />
            <div className="text-[10px] font-black uppercase tracking-[0.22em]">What Drills Are</div>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Drills are short reps for one manip skill at a time: read commons, spot noise, understand session history,
            follow carry line, translate raw pairs, use line helper, and learn force mappings before harder modes ask you
            to combine all of that at once.
          </p>
        </div>

        {isComplete ? (
          <div className="rounded-[2rem] border border-emerald-400/20 bg-slate-950/50 p-8 text-center">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Drills Complete</div>
            <h2 className="text-4xl font-black uppercase tracking-tight text-white">You Cleared The Foundations</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
              These drills are here to make the manip language feel normal. Once these concepts feel natural, Challenge Mode
              stops feeling like luck and starts feeling readable.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200 transition-all hover:border-white/20 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Restart Drills
              </button>
              <button
                type="button"
                onClick={() => navigate('/playground/challenge')}
                className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100 transition-all hover:bg-amber-500/20"
              >
                Go To Challenge Mode
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <aside className="space-y-6 xl:col-span-4">
              <div className="rounded-[1.35rem] border border-white/5 bg-slate-950/45 p-5">
                <div className="mb-3 flex items-center gap-2 text-emerald-200">
                  <BrainCircuit className="h-4 w-4" />
                  <div className="text-[10px] font-black uppercase tracking-[0.22em]">Current Drill</div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Drill {currentIndex + 1} / {drills.length}
                </div>
                <div className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                  {currentDrill.chapter}
                </div>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white">{currentDrill.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{currentDrill.subtitle}</p>

                <div className="mt-5 rounded-xl border border-white/5 bg-black/25 p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Skill Focus</div>
                  <div className="mt-2 text-sm font-semibold text-white">{currentDrill.skill}</div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{currentDrill.explanation}</p>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-white/5 bg-slate-950/45 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Drill Map</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {Object.keys(answers).length} Answered
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {drills.map((drill, index) => {
                    const answerState = answers[drill.id];
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
                        className={`rounded-xl border px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.16em] transition-all ${
                          index === currentIndex
                            ? 'border-cyan-400/35 bg-cyan-500/12 text-cyan-100'
                            : answerState?.correct
                              ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                              : answerState && !answerState.correct
                                ? 'border-rose-400/25 bg-rose-500/10 text-rose-100'
                                : 'border-white/5 bg-black/20 text-slate-400 hover:border-white/10 hover:text-white'
                        }`}
                      >
                        {drill.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <section className="space-y-6 xl:col-span-8">
              {currentEntries.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-white/5 bg-slate-950/45 p-5">
                    <ModernPairPredictorCard entries={currentEntries} region="America" />
                  </div>
                  <div className="rounded-[1.35rem] border border-white/5 bg-slate-950/45 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Session Snapshot</div>
                      <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
                        {[
                          { id: 'current', label: 'Current' },
                          { id: 'history', label: 'History' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSessionTab(tab.id)}
                            className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition-all ${
                              sessionTab === tab.id
                                ? 'bg-cyan-500/18 text-cyan-100'
                                : 'text-slate-500 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
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
              ) : null}

              <div className="rounded-[1.75rem] border border-white/5 bg-slate-950/45 p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Question</div>
                <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">{currentDrill.prompt}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  This drill is about one rule, not a full board solve. Read the prompt and commit to the strongest answer.
                </p>

                <div className="mt-6 grid gap-3">
                  {currentDrill.options.map((option) => {
                    const isChosen = selectedAnswer === option;
                    const isCorrect = currentDrill.correctAnswer === option;
                    const showState = revealed && (isChosen || isCorrect);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleReveal(option)}
                        disabled={revealed}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          !revealed
                            ? 'border-white/5 bg-black/20 text-slate-200 hover:border-cyan-400/20 hover:bg-cyan-500/6'
                            : showState && isCorrect
                              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                              : isChosen && !isCorrect
                                ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
                                : 'border-white/5 bg-black/20 text-slate-500'
                        }`}
                      >
                        <div className="text-[11px] font-black uppercase tracking-[0.16em]">{option}</div>
                      </button>
                    );
                  })}
                </div>

                {revealed ? (
                  <div className={`mt-6 rounded-2xl border p-4 ${
                    selectedAnswer === currentDrill.correctAnswer
                      ? 'border-emerald-400/25 bg-emerald-500/10'
                      : 'border-rose-400/25 bg-rose-500/10'
                  }`}>
                    <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                      selectedAnswer === currentDrill.correctAnswer ? 'text-emerald-200' : 'text-rose-200'
                    }`}>
                      {selectedAnswer === currentDrill.correctAnswer ? 'Correct Read' : 'Missed Read'}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200">{currentDrill.explanation}</p>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 transition-all hover:border-white/20 hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Restart
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!revealed}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition-all hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {currentIndex + 1 >= drills.length ? 'Finish Drills' : 'Next Drill'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
