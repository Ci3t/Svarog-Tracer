export const tutorialStageOneScript = [
  {
    id: "predictor-commons-noise",
    target: "#svarog-feed-focus",
    title: "Commons And Noise",
    body:
      "Start by reading the pair at the bottom. Commons are the safe lane the session is living on right now. Noise are the values trying to break or interrupt that lane.",
    action: "next",
  },
  {
    id: "predictor-main-lane",
    target: "#svarog-feed-focus",
    title: "Main Predictor And Lean",
    body:
      "Main Predictor shows the safer lane to follow. The % under each side is a lean, not true confidence. It shows which side the board prefers more right now.",
    action: "next",
  },
  {
    id: "predictor-warning-messages",
    target: "#svarog-feed-focus",
    title: "Warning Messages",
    body:
      "Warning messages tell you which value is most likely to break the current pair. Use them as pressure clues, not as automatic truth.",
    action: "next",
  },
  {
    id: "predictor-trends",
    target: "#tutorial-stats-helper",
    title: "Trend Arrows And Frequency",
    body:
      "Trend arrows show whether a line is rising, stable, or dropping. Frequency helps you judge which side is safer and which side is just a challenge value.",
    action: "next",
  },
  {
    id: "predictor-svarog-eye",
    target: "#svarog-feed-focus",
    title: "Svarog Eye",
    body:
      "Svarog Eye is the sharper exact-line lean. Main Predictor is the safer lane. Svarog is the sharper guess. When the board gets fragile, compare both.",
    action: "next",
  },
  {
    id: "predictor-mode",
    target: "#svarog-feed-focus",
    title: "Modes",
    body:
      "Modes describe what kind of pattern the system believes is active: alternating, run-break, shift, pressure, or chaos. That changes how much trust you put into the current lane.",
    action: "click",
    prompt: "Click Show details to open Advanced Mode.",
    waitFor: {
      type: "selector",
      value: "#tutorial-advanced-panel",
    },
  },
  {
    id: "wrong-path-upgrade",
    target: "#tutorial-target-relic",
    title: "Normal Upgrade First",
    body:
      "Now just play normally. Add the 4th line and keep upgrading the target relic all the way to +15 without manipulating anything.",
    action: "upgrade",
    waitFor: {
      type: "state",
      value: "target_level_15",
    },
  },
  {
    id: "wrong-path-reveal",
    target: "#tutorial-target-relic",
    title: "That Looks Fine, Right?",
    body:
      "This is the trap. The relic looks okay at first glance. Now we reset and learn the art of manipulation so we can control the line instead of accepting the normal path.",
    action: "click",
    prompt: "Press Reset Scenario.",
    waitFor: {
      type: "state",
      value: "scenario_reset",
    },
  },
  {
    id: "guided-add-fourth",
    target: "#tutorial-target-relic",
    title: "Add The 4th Sub",
    body:
      "Start the real solve. Add the 4th sub on the target relic. This puts us at 4x and gives us a control point of 4 before we manipulate the next line.",
    action: "click",
    prompt: "Press Add 4th.",
    waitFor: {
      type: "state",
      value: "fourth_line_added",
    },
  },
  {
    id: "guided-force-line-3",
    target: "#tutorial-setup-relic",
    title: "Force Line 3",
    body:
      "Now use the setup relic. Add a sub to the 3-line relic so you sit on line 3. That is how we control the next practical line. The site handles Caesar shift for you.",
    action: "click",
    prompt: "Press the setup relic button to force line 3.",
    waitFor: {
      type: "state",
      value: "setup_line_3_forced",
    },
  },
  {
    id: "guided-plus-6",
    target: "#tutorial-target-relic",
    title: "Take +6",
    body:
      "Now upgrade the target relic to +6. Predictor said it could be 42 or 43, and here it lands on 42, which means Crit Rate in this shifted setup.",
    action: "click",
    prompt: "Upgrade to +6.",
    waitFor: {
      type: "state",
      value: "target_level_6",
    },
  },
  {
    id: "guided-plus-9-read",
    target: "#tutorial-stats-helper",
    title: "How To Read +9",
    body:
      "Before +9, Main Predictor says 41 / 42 and Svarog says 42 / 43. Warning says 43 may break. Look at trends: 42 is the safer bet because it has the strongest frequency. 41 and 43 are the challenge values.",
    action: "next",
  },
  {
    id: "guided-plus-9-upgrade",
    target: "#tutorial-target-relic",
    title: "Take +9",
    body:
      "Using the safe read, upgrade to +9. This should land on Crit Damage.",
    action: "click",
    prompt: "Upgrade to +9.",
    waitFor: {
      type: "state",
      value: "target_level_9",
    },
  },
  {
    id: "guided-plus-12-read",
    target: "#tutorial-history-log",
    title: "Read The Sequence",
    body:
      "Now compare Main Predictor, Svarog, and the warning again. This time look at Sequence (last 9). After 43 commons hit 3 times, 43 appeared again, so the pattern is stronger there. In this spot, I would trust 43.",
    action: "next",
  },
  {
    id: "guided-plus-12-upgrade",
    target: "#tutorial-target-relic",
    title: "Take +12",
    body:
      "Go to +12 using that pattern read.",
    action: "click",
    prompt: "Upgrade to +12.",
    waitFor: {
      type: "state",
      value: "target_level_12",
    },
  },
  {
    id: "guided-plus-15-read",
    target: "#svarog-feed-focus",
    title: "Trust The Noise Side",
    body:
      "Now Main says 42 / 43 but Svarog says 42 / 41. Break pressure is on 41 and noise risk is elevated. Session is chaotic and the watch message says 41, 44 may break the pair. In this final spot, trust the noise side.",
    action: "next",
  },
  {
    id: "guided-plus-15-upgrade",
    target: "#tutorial-target-relic",
    title: "Finish The Relic",
    body:
      "Take the relic to +15 using the noise-side trust read.",
    action: "click",
    prompt: "Upgrade to +15.",
    waitFor: {
      type: "state",
      value: "target_level_15_final",
    },
  },
];

export default tutorialStageOneScript;
