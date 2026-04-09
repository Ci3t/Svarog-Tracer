export const tutorialStageOneScript = [
  {
    id: 'round-1-lines',
    target: '#tutorial-history-log',
    title: 'Round 1: What 43 means',
    body:
      'Start with the meaning of the visible roll itself. 43 means you started on line 4 and landed on line 3. The first digit is your control point. The second digit is the line you actually hit.',
    action: 'next',
  },
  {
    id: 'round-2-4x',
    target: '#tutorial-target-relic',
    title: 'Round 2: What 4x control is',
    body:
      'When we say 4x control here, we mean we are working with the full four-line state of the relic. Adding the 4th line gives us a cleaner control view before we start teaching deeper reads.',
    action: 'next',
  },
  {
    id: 'round-3-normal-upgrade',
    target: '#tutorial-target-relic',
    title: 'Round 3: Try the normal path first',
    body:
      'Before we manipulate anything, just play the relic normally. Add the 4th sub and keep upgrading to +15. We want you to see the natural outcome before we control it.',
    action: 'upgrade',
    waitFor: {
      type: 'state',
      value: 'target_level_15',
    },
  },
  {
    id: 'round-4-why-normal-missed',
    target: '#tutorial-target-relic',
    title: 'Round 4: Why the normal path missed',
    body:
      'That is the difference between reading and controlling. The natural path can still miss because your control point was wrong for the result you wanted. Reset the scenario so we can fix that.',
    action: 'click',
    prompt: 'Press Reset Scenario.',
    waitFor: {
      type: 'state',
      value: 'scenario_reset',
    },
  },
  {
    id: 'round-5-4x-and-lines',
    target: '#tutorial-target-relic',
    title: 'Round 5: Rebuild the full line state',
    body:
      'Add the 4th sub again. This re-establishes the full line state so we can guide the next result properly. You do not need deep Caesar math yet. Just remember that the start line changes the landing line.',
    action: 'click',
    prompt: 'Press Add 4th.',
    waitFor: {
      type: 'state',
      value: 'fourth_line_added',
    },
  },
  {
    id: 'round-6-force-line',
    target: '#tutorial-setup-relic',
    title: 'Round 6: Force the correct line',
    body:
      'Now we use the setup relic. This is the beginner version of force-line. Force line 3 first, then return to the target relic. Later we explain Caesar shift in more depth, but the practical lesson is simple: change the line, change the outcome.',
    action: 'click',
    prompt: 'Use the setup relic to force line 3.',
    waitFor: {
      type: 'state',
      value: 'setup_line_3_forced',
    },
  },
  {
    id: 'round-7-controlled-upgrades',
    target: '#tutorial-target-relic',
    title: 'Round 7: Follow the controlled path',
    body:
      'Now the board and the relic are aligned. Upgrade through the next checkpoints and watch the controlled path land on the good side instead of leaking into junk. This is your first feel for line control.',
    action: 'click',
    prompt: 'Upgrade until you reach +12.',
    waitFor: {
      type: 'state',
      value: 'target_level_12',
    },
  },
  {
    id: 'round-8-final-read',
    target: '#tutorial-watch-message',
    title: 'Round 8: Finish the first lesson',
    body:
      'For the last step, read the warning line before you commit. You do not need to master pressure yet. Just finish the relic and feel the difference between a normal path and a controlled one.',
    action: 'click',
    prompt: 'Finish the relic to +15.',
    waitFor: {
      type: 'state',
      value: 'target_level_15_final',
    },
    placement: 'bottom',
  },
];

export default tutorialStageOneScript;
