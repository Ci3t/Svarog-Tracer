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
      'This is the kind of board that should feel easy. One value is clearly dominating and the second value is the readable partner, so you start from the commons pair instead of overthinking noise.',
  },
  {
    id: 'noise-spot',
    chapter: 'Predictor Basics',
    title: 'Spot The Noise',
    subtitle: 'Which side is trying to interrupt the lane?',
    skill: 'Noise Awareness',
    starterRolls: ['42', '43', '42', '43', '44', '42'],
    type: 'noise',
    explanation:
      'A clean pair can still have a trap side. Noise tells you which values are trying to break the lane, so you know what to respect before you commit to a target relic.',
  },
  {
    id: 'trusted-pair-read',
    chapter: 'Predictor Basics',
    title: 'Trust The Safe Pair',
    subtitle: 'Pick the lane you should lean on first.',
    skill: 'Safe Lane Reading',
    starterRolls: ['43', '43', '42', '43', '42', '43'],
    type: 'commons',
    prompt: 'Which pair is acting like the safe lane in this snapshot?',
    explanation:
      'When one pair keeps repeating cleanly, that is your first read. You do not start from the outsider values. You start from the lane the session is already living on.',
  },
  {
    id: 'break-side-read',
    chapter: 'Predictor Basics',
    title: 'Respect The Break Side',
    subtitle: 'Find the values most likely to break the readable lane.',
    skill: 'Break Awareness',
    starterRolls: ['41', '43', '41', '43', '44', '41'],
    type: 'noise',
    prompt: 'Which pair is acting like the break side here?',
    explanation:
      'A board can look very readable and still have one dangerous outside side. That break side matters because it tells you what values may punish a lazy read.',
  },
  {
    id: 'dont-overreact-noise',
    chapter: 'Predictor Basics',
    title: 'Do Not Overreact',
    subtitle: 'One outsider hit does not automatically destroy the lane.',
    skill: 'Session Patience',
    starterRolls: ['41', '42', '41', '42', '44', '41'],
    type: 'commons',
    prompt: 'After one 44 break, which pair should you still read first?',
    explanation:
      'One outsider does not always mean the board is dead. If the same commons pair is still doing most of the work, you respect the lane first and treat the outsider as noise until proven otherwise.',
  },
  {
    id: 'line-two-force',
    chapter: 'Force Lines',
    title: 'Force Line 2',
    subtitle: 'Pick the relic that sits you on line 2.',
    skill: 'Line Forcing',
    type: 'force',
    prompt: 'You want to sit on line 2 before returning to the target relic. Which relic do you use?',
    answer: '1-liner',
    options: ['1-liner', '2-liner', '3-liner'],
    explanation:
      'A 1-line relic forces line 2. This is the simplest detour in the whole system and the first mapping you should memorize.',
  },
  {
    id: 'line-three-force',
    chapter: 'Force Lines',
    title: 'Force Line 3',
    subtitle: 'Choose the detour relic that sits you on the right line.',
    skill: 'Line Forcing',
    type: 'force',
    prompt: 'You want to sit on line 3 before returning to the target relic. Which relic do you use?',
    answer: '2-liner',
    options: ['1-liner', '2-liner', '3-liner'],
    explanation:
      'A 2-line relic forces line 3. This is the detour used often in dual-crit and cleanup paths because it gives you a practical shift without needing a fresh session.',
  },
  {
    id: 'line-four-force',
    chapter: 'Force Lines',
    title: 'Force Line 4',
    subtitle: 'Know the last standard detour mapping too.',
    skill: 'Line Forcing',
    type: 'force',
    prompt: 'You want to sit on line 4 before returning to the target relic. Which relic do you use?',
    answer: '3-liner',
    options: ['1-liner', '2-liner', '3-liner'],
    explanation:
      'A 3-line relic forces line 4. Once you know line 2, 3, and 4 forcing cleanly, the detour system stops feeling magical and starts feeling practical.',
  },
  {
    id: 'build-session-first',
    chapter: 'Relic Setup',
    title: 'Build The Read First',
    subtitle: 'Do not guess before the predictor has shape.',
    skill: 'Session Building',
    type: 'decision',
    prompt: 'At the start of a fresh window with almost no readable history, what is the best first move?',
    answer: 'Use the session builder relic to create readable data',
    options: [
      'Use the session builder relic to create readable data',
      'Immediately slam the target relic',
      'Reset until the target looks lucky',
    ],
    explanation:
      'If the board does not have enough shape yet, you should not brute-force the target relic. Build readable history first so the predictor has something real to teach you.',
  },
  {
    id: 'bad-direct-path',
    chapter: 'Relic Setup',
    title: 'Bad Direct Path',
    subtitle: 'Sometimes the lane is good, but the target relic is wrong for it.',
    skill: 'Target Judgment',
    type: 'decision',
    prompt: 'Main Predictor looks safe, but that safe lane lands on EFF RES and BREAK EFFECT on your target relic. What is the right read?',
    answer: 'Detour first, then return to the target relic',
    options: [
      'Detour first, then return to the target relic',
      'Keep upgrading because the lane is safe',
      'Ignore the target relic and only watch session data',
    ],
    explanation:
      'A safe lane is not automatically a good target path. If the readable pair lands on junk stats, that is exactly when detours and force-line practice matter.',
  },
  {
    id: 'dual-crit-means-both',
    chapter: 'Relic Goals',
    title: 'Dual Crit Means Both',
    subtitle: 'One crit line carrying the whole relic is not a dual-crit solve.',
    skill: 'Goal Reading',
    type: 'decision',
    prompt: 'A mission says dual crit. You finish with CRIT RATE x0 and CRIT DMG x3. Is that a clear?',
    answer: 'No, dual crit means both crit lines must be hit',
    options: [
      'No, dual crit means both crit lines must be hit',
      'Yes, three hits on one crit line is enough',
      'Yes, because total crit hits matter more than distribution',
    ],
    explanation:
      'Dual crit is not “a lot of one crit stat.” It means both CRIT RATE and CRIT DMG were part of the finish. If one side is zero, that is not a true dual-crit solve.',
  },
  {
    id: 'reforce-discipline',
    chapter: 'Relic Goals',
    title: 'Re-force Discipline',
    subtitle: 'One good hit is not always enough.',
    skill: 'Discipline',
    type: 'discipline',
    prompt: 'You got the first good mono-line hit, but the path will drift after that. What is the right read?',
    answer: 'Re-force before the next upgrade',
    options: [
      'Re-force before the next upgrade',
      'Keep upgrading because the first hit proved the lane',
      'Reset the session immediately',
    ],
    explanation:
      'Mono-line solving is harder because one success does not guarantee the next hit stays clean. The discipline skill is noticing when you must re-force instead of trusting momentum.',
  },
  {
    id: 'mono-is-harder',
    chapter: 'Relic Goals',
    title: 'Know What Is Harder',
    subtitle: 'Not every mission type is equal.',
    skill: 'Difficulty Awareness',
    type: 'decision',
    prompt: 'Which mission is usually harder to solve cleanly: dual-crit or mono-line?',
    answer: 'Mono-line is usually harder',
    options: [
      'Mono-line is usually harder',
      'Dual-crit is always harder',
      'They are exactly the same difficulty',
    ],
    explanation:
      'Mono-line paths usually demand more discipline because you often need the same line to keep landing correctly multiple times. Dual-crit gives you two acceptable finish lines instead of one.',
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

function buildDrill(definition) {
  if (!definition.starterRolls) {
    return {
      ...definition,
      correctAnswer: definition.answer,
      options: definition.options,
      prediction: null,
    };
  }

  const prediction = predictWithPairs(definition.starterRolls, { region: 'America' });
  const trustedPair = Array.isArray(prediction?.trustedPair) && prediction.trustedPair.length === 2
    ? prediction.trustedPair
    : prediction?.commons || ['41', '42'];
  const noisePair = Array.isArray(prediction?.noise) && prediction.noise.length > 0
    ? prediction.noise.slice(0, 2)
    : ['43', '44'];

  if (definition.type === 'commons') {
    const correct = pairKey(trustedPair);
    const distractors = ALL_PAIRS
      .map(pairKey)
      .filter((entry) => entry !== correct)
      .slice(0, 3);
    return {
      ...definition,
      prediction,
      correctAnswer: correct,
      options: uniqueOptions([correct, ...distractors]).slice(0, 4),
      prompt: definition.prompt || 'Which pair should you treat as the commons lane?',
    };
  }

  if (definition.type === 'noise') {
    const correct = pairKey(noisePair);
    const distractors = ALL_PAIRS
      .map(pairKey)
      .filter((entry) => entry !== correct)
      .slice(0, 3);
    return {
      ...definition,
      prediction,
      correctAnswer: correct,
      options: uniqueOptions([correct, ...distractors]).slice(0, 4),
      prompt: definition.prompt || 'Which values are acting like the noise side here?',
    };
  }

  return {
    ...definition,
    correctAnswer: definition.answer,
    options: definition.options,
    prediction: null,
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
            Drills are not a full tutorial and not a full contract. They are short reps for one beginner skill at a time:
            read the predictor, understand the break side, learn force-line mappings, and make basic relic decisions before full Challenge Mode.
          </p>
        </div>

        {isComplete ? (
          <div className="rounded-[2rem] border border-emerald-400/20 bg-slate-950/50 p-8 text-center">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Drills Complete</div>
            <h2 className="text-4xl font-black uppercase tracking-tight text-white">You Cleared The Warmup</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
              That is the idea of Drills: fast reps, one idea at a time. Once these feel natural, Challenge Mode should feel less like guessing and more like reading.
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
                  <div className="mt-1 text-lg font-black text-white">{currentDrill.skill}</div>
                </div>

                {currentDrill.starterRolls ? (
                  <div className="mt-5 rounded-xl border border-white/5 bg-black/25 p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Session Snapshot</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentDrill.starterRolls.map((roll, index) => (
                        <span
                          key={`${currentDrill.id}-${roll}-${index}`}
                          className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100"
                        >
                          {roll}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-white/5 bg-black/25 p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Mini Scenario</div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      This drill is about one rule, not a full board solve. Read the prompt and commit to the correct move.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[1.35rem] border border-white/5 bg-slate-950/45 p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Progress</div>
                <div className="mt-3 space-y-2">
                  {drills.map((drill, index) => {
                    const answerState = answers[drill.id];
                    const isCurrent = index === currentIndex;
                    return (
                      <div
                        key={drill.id}
                        className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
                          answerState?.correct
                            ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                            : answerState && !answerState.correct
                              ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
                              : isCurrent
                                ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100'
                                : 'border-white/5 bg-black/20 text-slate-500'
                        }`}
                      >
                        {drill.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            <section className="space-y-6 xl:col-span-8">
              {currentDrill.starterRolls ? (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                  <div className="xl:col-span-7">
                    <ModernPairPredictorCard entries={currentEntries} region="America" />
                  </div>
                  <div className="xl:col-span-5">
                    <ModernSessionTable
                      sessionTab={sessionTab}
                      setSessionTab={setSessionTab}
                      entries={currentEntries}
                      prevSessions={[]}
                      compact
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-[1.5rem] border border-white/5 bg-slate-950/45 p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Prompt</div>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">{currentDrill.prompt}</h3>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {currentDrill.options.map((option) => {
                    const isChosen = selectedAnswer === option;
                    const isCorrect = option === currentDrill.correctAnswer;
                    const tone = !revealed
                      ? 'border-white/5 bg-black/20 text-slate-200 hover:border-white/10'
                      : isCorrect
                        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                        : isChosen
                          ? 'border-rose-400/25 bg-rose-500/10 text-rose-100'
                          : 'border-white/5 bg-black/20 text-slate-500';

                    return (
                      <button
                        key={`${currentDrill.id}-${option}`}
                        type="button"
                        disabled={revealed}
                        onClick={() => handleReveal(option)}
                        className={`rounded-[1.2rem] border px-4 py-4 text-left text-sm font-black uppercase tracking-[0.16em] transition-all ${tone}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {revealed ? (
                <div className="rounded-[1.5rem] border border-white/5 bg-slate-950/45 p-6">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Review</div>
                  <div
                    className={`mt-3 rounded-xl border px-4 py-3 text-sm font-black uppercase tracking-[0.16em] ${
                      selectedAnswer === currentDrill.correctAnswer
                        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                        : 'border-rose-400/25 bg-rose-500/10 text-rose-100'
                    }`}
                  >
                    {selectedAnswer === currentDrill.correctAnswer ? 'Correct Read' : 'Wrong Read'}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">{currentDrill.explanation}</p>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition-all hover:bg-cyan-500/20"
                    >
                      {currentIndex + 1 >= drills.length ? 'Finish Drills' : 'Next Drill'}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
