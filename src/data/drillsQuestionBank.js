export const DRILLS_QUESTION_BANK = [
  {
    "number": 1,
    "chapter": "Predictor Basics",
    "id": "live-mode-purpose",
    "title": "Live Mode Purpose",
    "subtitle": "Start with what the tool is actually for.",
    "skill": "Live Mode",
    "voicePath": "companions/Clara/drills-sound/Clara - Q1 Drills guide.mp3",
    "options": [
      "To increase the base stats of your characters.",
      "To predict the next RNG roll and find a path to a better line.",
      "To record your gacha history for public sharing.",
      "To find your current \"Seed\" by testing luxury chests."
    ],
    "scenarioTags": [],
    "correctAnswer": "To predict the next RNG roll and find a path to a better line.",
    "starterRolls": [],
    "prompt": "What is the primary purpose of Live Mode in the Svarog System?",
    "lesson": "Live Mode tracks the secret sequence of random numbers in the game. It lets Svarog map out the path to your target stats!",
    "successText": "Exactly! Live Mode maps the RNG sequence in real-time so Svarog can calculate exactly how many steps we need to take to hit your target stat.",
    "mistakeText": "Not quite. While recording history is a side effect, the true power of Live Mode is predicting the sequence to manipulate relic upgrades. It's about pathfinding, not just logging!"
  },
  {
    "number": 2,
    "chapter": "Predictor Basics",
    "id": "commons-read",
    "title": "Read The Commons",
    "subtitle": "Find the active lane before you guess.",
    "skill": "Pair Reading",
    "voicePath": "companions/Clara/drills-sound/Clara - Q2 Drills guide.mp3",
    "options": [
      "41 / 44",
      "42 / 43",
      "41 / 42",
      "41 / 43"
    ],
    "scenarioTags": [],
    "correctAnswer": "41 / 44",
    "starterRolls": [
      "41",
      "41",
      "41",
      "44",
      "41",
      "41"
    ],
    "prompt": "When one value clearly dominates and one partner keeps returning with it, which pair should you treat as the commons lane?",
    "lesson": "An 'RNG Read' is a check that gives us a physical number. We need that number to stay in sync with the game's internal clock!",
    "successText": "Correct! Since 41 is dominating and 44 appeared as the only partner, those two form your active lane. We read from the commons first!",
    "mistakeText": "Look closer at the rolls. 41 is everywhere, and 44 is the only other value that appeared. That makes 41/44 your commons lane. We ignore the other pairs until they show actual momentum."
  },
  {
    "number": 3,
    "chapter": "Predictor Basics",
    "id": "noise-spot",
    "title": "Spot The Noise",
    "subtitle": "Separate the lane from the outsider.",
    "skill": "Noise Awareness",
    "voicePath": "companions/Clara/drills-sound/Clara - Q3 Drills guide.mp3",
    "options": [
      "42",
      "43",
      "44",
      "41"
    ],
    "scenarioTags": [],
    "correctAnswer": "44",
    "starterRolls": [
      "42",
      "43",
      "42",
      "43",
      "44",
      "42"
    ],
    "prompt": "Which value is acting as the \"noise\" side currently?",
    "lesson": "Your 'Line' is just a spot in a 4-step circle. Svarog uses your raw rollout to find exactly which bookmark you are on.",
    "successText": "Exactly! 42 and 43 are alternating cleanly, but 44 jumped in once to disrupt them. That's our noise value.",
    "mistakeText": "Not quite. 42 and 43 are the partners in the lane. 44 is the 'outsider' that interrupted the rhythm. In Svarog logic, that's called Noise."
  },
  {
    "number": 4,
    "chapter": "Predictor Basics",
    "id": "trend-share-meaning",
    "title": "Trend Share",
    "subtitle": "Read the percentage without overpromising it.",
    "skill": "Trend Reading",
    "voicePath": "companions/Clara/drills-sound/Clara - Q4 Drills guide.mp3",
    "options": [
      "The predictor is 40% sure the value is correct.",
      "That value owned 40% of the latest 5-roll trend window.",
      "The value will repeat 40% of the rest of the session.",
      "You have a 40% chance of hitting the target stat."
    ],
    "scenarioTags": [],
    "correctAnswer": "That value owned 40% of the latest 5-roll trend window.",
    "starterRolls": [],
    "prompt": "In the predictor, what does \"trend share 40%\" actually mean?",
    "lesson": "Trend Share is like a head-count! It tells you how many of the last few rolls belonged to each specific value.",
    "successText": "Correct! Trend share is just a measurement of the recent window. It tells you how much that value 'owned' the screen lately.",
    "mistakeText": "Careful! You're confusing share with confidence. Trend share just means 2 out of the last 5 rolls were that value. It doesn't mean Svarog is 40% sure!"
  },
  {
    "number": 5,
    "chapter": "Predictor Basics",
    "id": "trust-meaning",
    "title": "Trust Meaning",
    "subtitle": "Confidence in direction, not a guaranteed roll.",
    "skill": "Trend Reading",
    "voicePath": "companions/Clara/drills-sound/Clara - Q5 Drills guide.mp3",
    "options": [
      "The predictor strongly believes the arrow direction itself.",
      "That value appeared in 100% of the recent rolls.",
      "The board is safe and cannot break.",
      "Your next roll is 100% guaranteed to be this value."
    ],
    "scenarioTags": [],
    "correctAnswer": "The predictor strongly believes the arrow direction itself.",
    "starterRolls": [],
    "prompt": "What does \"trust 100%\" in the trends panel actually mean?",
    "lesson": "Trust isn't about your luck! It's about how much mathematical confidence Svarog has in the arrow's direction.",
    "successText": "Perfect! Trust is our confidence in the *direction* (rising/falling). It's not a guarantee of the result, but a guarantee that we trust the trend's movement.",
    "mistakeText": "Wait! 100% trust doesn't mean the roll is guaranteed. It means Svarog is 100% sure that the value is *rising* or *falling* according to the math. The direction is solid, even if the result isn't yet."
  },
  {
    "number": 6,
    "chapter": "Predictor Basics",
    "id": "freshness-meaning",
    "title": "Freshness",
    "subtitle": "Know whether the arrow is new or fading.",
    "skill": "Trend Reading",
    "voicePath": "companions/Clara/drills-sound/Clara - Q6 Drills guide.mp3",
    "options": [
      "How recently that same arrow changed or stayed alive.",
      "How many total times the value appeared this session.",
      "How much junk the relic currently has.",
      "How many rolls are left in the 5-minute window."
    ],
    "scenarioTags": [],
    "correctAnswer": "How recently that same arrow changed or stayed alive.",
    "starterRolls": [],
    "prompt": "What does \"freshness\" measure in the predictor?",
    "lesson": "Signals can get old, just like bread! Freshness tells you if a trend is new and strong, or if it's getting stale.",
    "successText": "Exactly! Freshness is all about timing. A 'Fresh' arrow means a new push is starting. A 'Stale' arrow means the signal is getting old and might break soon.",
    "mistakeText": "Not quite. Freshness tracks the life of the arrow. If an arrow has been the same for a long time, it becomes 'Stale'. If it just changed, it's 'Fresh'!"
  },
  {
    "number": 7,
    "chapter": "Session Reading",
    "id": "dominant-roll-read",
    "title": "Dominant Roll",
    "subtitle": "Find the value that is really running the board.",
    "skill": "Session Reading",
    "voicePath": "companions/Clara/drills-sound/Clara - Q7 Drills guide.mp3",
    "options": [
      "41",
      "42",
      "44",
      "43"
    ],
    "scenarioTags": [],
    "correctAnswer": "41",
    "starterRolls": [
      "41",
      "41",
      "41",
      "41",
      "44",
      "41"
    ],
    "prompt": "Which roll is dominant in this session snapshot?",
    "lesson": "Dominance means one value is winning most of the time. Even if it loses once or twice, it's still the master of the board!",
    "successText": "Correct! Dominant doesn't mean perfect. Even with that one 44 interuption, 41 is clearly running the board.",
    "mistakeText": "Look at the numbers again. 41 appeared five times! Even with one 44 breaking in, 41 is the dominant force. We follow the majority!"
  },
  {
    "number": 8,
    "chapter": "Session Reading",
    "id": "how-many-times-runs",
    "title": "Count The Run",
    "subtitle": "Read the streak length before the break.",
    "skill": "Session Reading",
    "voicePath": "companions/Clara/drills-sound/Clara - Q8 Drills guide.mp3",
    "options": [
      "3",
      "4",
      "5",
      "6"
    ],
    "scenarioTags": [],
    "correctAnswer": "4",
    "starterRolls": [
      "44",
      "44",
      "44",
      "44",
      "42",
      "44"
    ],
    "prompt": "Before the 42 break, how many times did 44 run in a row?",
    "lesson": "Counting streaks (N-runs) lets Svarog know when a pattern is likely to keep going or finally snap.",
    "successText": "Correct! 44 ran four times before the 42 interrupted. Knowing the streak length helps Svarog calculate if a flip is overdue.",
    "mistakeText": "Count them carefully: 44, 44, 44, 44... that's four in a row before the 42 hit. We call that an N-run of 4!"
  },
  {
    "number": 9,
    "chapter": "Session Reading",
    "id": "chaotic-session-read",
    "title": "Chaotic Session",
    "subtitle": "Recognize when the board is too messy to trust.",
    "skill": "Session Reading",
    "voicePath": "companions/Clara/drills-sound/Clara - Q9 Drills guide.mp3",
    "options": [
      "All four values are active and the lane keeps changing.",
      "Because one value appears three times.",
      "Because chaos means the same value repeats.",
      "Because the rolls were entered too fast."
    ],
    "scenarioTags": [],
    "correctAnswer": "All four values are active and the lane keeps changing.",
    "starterRolls": [
      "41",
      "44",
      "42",
      "43",
      "44",
      "41"
    ],
    "prompt": "Why does this snapshot read as chaotic instead of clean?",
    "lesson": "A chaotic session is just too messy to read. It's like a lot of people talking at once—no one value is in charge!",
    "successText": "Exactly! When all four values (41, 42, 43, 44) are fighting for the screen, there is no 'lane'. That's a chaotic session where you should be careful.",
    "mistakeText": "Look at the variety! Every value is showing up and the partners keep switching. A clean session has a dominant pair; this has four-way noise. That's Chaos!"
  },
  {
    "number": 10,
    "chapter": "Session Reading",
    "id": "sequence-session-read",
    "title": "Sequence Session",
    "subtitle": "Some boards are rhythm, not dominance.",
    "skill": "Session Reading",
    "voicePath": "companions/Clara/drills-sound/Clara - Q10 Drills guide.mp3",
    "options": [
      "The board is repeating a readable alternating rhythm.",
      "One outsider appeared once.",
      "The board has no pattern at all.",
      "One value is appearing 100% of the time."
    ],
    "scenarioTags": [],
    "correctAnswer": "The board is repeating a readable alternating rhythm.",
    "starterRolls": [
      "42",
      "43",
      "42",
      "43",
      "42",
      "43"
    ],
    "prompt": "What makes this feel like a sequence session?",
    "lesson": "A sequence session is like a dance! It moves with a repeating rhythm instead of just having one big winner.",
    "successText": "Perfect! It's flip-flopping: 42-43-42-43. This isn't dominance, it's a sequence. We can predict the next flip easily!",
    "mistakeText": "Rhythm over power! A sequence session doesn't need one value to win; it just needs the transitions to be predictable. 42->43 is a clear repeating sequence."
  },
  {
    "number": 11,
    "chapter": "Session Reading",
    "id": "session-history-read",
    "title": "Trust Session History",
    "subtitle": "One outsider does not erase the whole lane.",
    "skill": "Session Reading",
    "voicePath": "companions/Clara/drills-sound/Clara - Q11 Drills guide.mp3",
    "options": [
      "The repeated 41 lane.",
      "The single 44 outsider.",
      "Neither, because one break deletes the history.",
      "You should reset the session."
    ],
    "scenarioTags": [],
    "correctAnswer": "The repeated 41 lane.",
    "starterRolls": [
      "41",
      "41",
      "42",
      "41",
      "41",
      "44",
      "41",
      "41"
    ],
    "prompt": "What should you trust first: the repeated 41 lane or the single 44 outsider?",
    "lesson": "History is our best map. One surprise result (Noise) shouldn't make you forget the whole path we've traveled!",
    "successText": "Smart! One loud noise (44) doesn't erase a long history of 41. We stay with the lane until the noise starts to dominate.",
    "mistakeText": "Don't let one 'break' distract you. The 41 has appeared six times. The 44 only once. Trust the history — the 41 lane is still the primary trend!"
  },
  {
    "number": 12,
    "chapter": "Translation & Logic",
    "id": "what-is-13",
    "title": "Raw Pair 13",
    "subtitle": "Translate the pair into line and slot.",
    "skill": "Translation",
    "voicePath": "companions/Clara/drills-sound/Clara - Q12 Drills guide.mp3",
    "options": [
      "You were on Line 1 and landed on Slot 3.",
      "You were on Slot 1 and the next roll became 3.",
      "It means the board is currently on Line 13.",
      "You hit 1 and then 3 in a sequence."
    ],
    "scenarioTags": [],
    "correctAnswer": "You were on Line 1 and landed on Slot 3.",
    "starterRolls": [],
    "prompt": "What does raw pair \"13\" actually mean in Svarog logic?",
    "lesson": "Raw pairs are the secret language of the game! A pair like 13 means 'Start at Line 1, Land on Slot 3'.",
    "successText": "Correct! The first number is your starting line, and the second is your landing spot. Raw pair 13 connects the dots!",
    "mistakeText": "Wait! In our pair system, the first digit is always the starting Line and the second is the target Slot. 1 -> 3. Simple as that!"
  },
  {
    "number": 13,
    "chapter": "Translation & Logic",
    "id": "what-is-caesar-shift",
    "title": "Caesar Shift",
    "subtitle": "Convert hidden raw pairs into visible 4x rolls.",
    "skill": "Translation",
    "voicePath": "companions/Clara/drills-sound/Clara - Q13 Drills guide.mp3",
    "options": [
      "Convert hidden raw pairs like 23 into the visible 4x roll language.",
      "Force the board into line 4 automatically.",
      "Rank relics by score tier.",
      "Decrypt game files from the server."
    ],
    "scenarioTags": [],
    "correctAnswer": "Convert hidden raw pairs like 23 into the visible 4x roll language.",
    "starterRolls": [],
    "prompt": "What does the Caesar Shift help you do?",
    "lesson": "Visible rolls (41-44) are just translated raw pairs. Svarog uses Caesar Shifts as a translation dictionary!",
    "successText": "Exactly! Every visible roll (41, 42, etc.) is just a 'shifted' version of a raw pair. Caesar logic is how we translate between the two.",
    "mistakeText": "Not quite. Caesar Shift is our translation layer. It takes the hidden logic of lines and slots and turns it into the 4x numbers you actually see in-game."
  },
  {
    "number": 14,
    "chapter": "Translation & Logic",
    "id": "slot-targeting-43",
    "title": "Target Slot On 43",
    "subtitle": "Work backward from the visible roll to the winning pair.",
    "skill": "Translation",
    "voicePath": "companions/Clara/drills-sound/Clara - Q14 Drills guide.mp3",
    "options": [
      "14",
      "21",
      "32",
      "43"
    ],
    "scenarioTags": [],
    "correctAnswer": "21",
    "starterRolls": [],
    "prompt": "If the next visible roll is 43 and you want Slot 1, which raw pair should you choose?",
    "lesson": "Each visible number has four different paths behind it. You have to pick the right one for the Slot you want to hit!",
    "successText": "Perfect calculation! For a 43 roll, the raw target for Slot 1 is always 21. Svarog is proud of your precision.",
    "mistakeText": "Math check! For visible 43, the paths are 14, 21, 32, 43. If you want Slot 1, you need to be on Line 2 (making the raw pair 21)!"
  },
  {
    "number": 15,
    "chapter": "Translation & Logic",
    "id": "line-two-force",
    "title": "Force Line 2",
    "subtitle": "Use the right relic count to reposition the line.",
    "skill": "Force Lines",
    "voicePath": "companions/Clara/drills-sound/Clara - Q15 Drills guide.mp3",
    "options": [
      "1-liner",
      "2-liner",
      "3-liner",
      "4-liner / 5-star"
    ],
    "scenarioTags": [],
    "correctAnswer": "1-liner",
    "starterRolls": [],
    "prompt": "You want to sit on Line 2 before the next real hit. Which relic do you use to 'Force' it?",
    "lesson": "By using a 1-line or 2-line relic as a sacrifice, you can physically move your position in the RNG cycle!",
    "successText": "Correct! A 1-line relic advances you to Line 2. It's the most basic way to reposition your sitting line.",
    "mistakeText": "Remember the rule! To get to Line 2, you use a 1-liner. To get to Line 3, you use a 2-liner. Each line on the 'sacrifice' relic moves you forward one step!"
  },
  {
    "number": 16,
    "chapter": "Planning & Advanced",
    "id": "next-step-setup",
    "title": "Set Up The Next Hit",
    "subtitle": "Move the sitting line before the real click.",
    "skill": "Planning",
    "voicePath": "companions/Clara/drills-sound/Clara - Q16 Drills guide.mp3",
    "options": [
      "Line 1",
      "Line 2",
      "Line 4",
      "Line 3"
    ],
    "scenarioTags": [],
    "correctAnswer": "Line 3",
    "starterRolls": [],
    "prompt": "If the next visible roll is 42 and the stat you want is on Slot 1, what line do you want to be sitting on first?",
    "lesson": "Manipulation is all about the next step. Sometimes you have to move your line first to set up a win on the next turn!",
    "successText": "Correct. For a visible 42, landing on Slot 1 means backing into the line that owns that path first. Set the line, then take the hit.",
    "mistakeText": "Think backward from the slot. For visible 42, you do not click from any random line and hope. You first move onto the line that feeds Slot 1, then take the real hit."
  },
  {
    "number": 17,
    "chapter": "Planning & Advanced",
    "id": "builder-session-basics",
    "title": "Build Data First",
    "subtitle": "Use a builder relic before touching the real piece.",
    "skill": "Builder Basics",
    "voicePath": "companions/Clara/drills-sound/Clara - Q17 Drills guide.mp3",
    "options": [
      "Use the trash relics to create readable session data.",
      "Immediately slam the target relic.",
      "Keep waiting without clicking anything.",
      "Restart the app until a '41' appears."
    ],
    "scenarioTags": [],
    "correctAnswer": "Use the trash relics to create readable session data.",
    "starterRolls": [],
    "prompt": "If the session window is empty, what should you do first?",
    "lesson": "Data is power! Entering a few 'trash' rolls first gives Svarog the history he needs to see the real trend.",
    "successText": "Smart approach. Never guess in the dark! Use a trash 'builder' relic to give Svarog some rolls to analyze before you touch your good gear.",
    "mistakeText": "Hold on! Starting with no data is just gambling. Use a builder relic to feed Svarog 6-10 rolls so we can actually see the pattern first."
  },
  {
    "number": 18,
    "chapter": "Planning & Advanced",
    "id": "four-x-control",
    "title": "4x Control",
    "subtitle": "Know when Svarog has the full cycle mapped.",
    "skill": "Diagnostics",
    "voicePath": "companions/Clara/drills-sound/Clara - Q18 Drills guide.mp3",
    "options": [
      "You have 4 characters in your party lead.",
      "You have entered data for all 4 lines (1, 2, 3, 4), giving Svarog a full map of the cycle.",
      "You have achieved a GOLDEN verdict on all 3 columns."
    ],
    "scenarioTags": [],
    "correctAnswer": "You have entered data for all 4 lines (1, 2, 3, 4), giving Svarog a full map of the cycle.",
    "starterRolls": [],
    "prompt": "What is \"4x Control\" state?",
    "lesson": "Once Svarog has seen every line (1, 2, 3, and 4), he has 'Full Cycle Awareness' and can't be fooled by the game!",
    "successText": "Exactly! Once we've seen a readout for every line in the cycle, Svarog has a 100% complete map. Manipulation becomes deterministic and foolproof!",
    "mistakeText": "Actually, 4x Control means 'Full Cycle Awareness'. It means we've recorded data for all four lines, so Svarog knows exactly what every single step will produce."
  },
  {
    "number": 19,
    "chapter": "Svarog Diagnostics",
    "id": "pair-safety-danger",
    "title": "Pair Safety Danger",
    "subtitle": "Understand what a danger warning is actually telling you.",
    "skill": "Diagnostics",
    "voicePath": "companions/Clara/drills-sound/Clara - Q19 Drills guide.mp3",
    "options": [
      "Your account is about to be suspended.",
      "High noise levels are contaminating the session, making reads unreliable.",
      "The predicted roll is an \"Outsider\" that rarely appears."
    ],
    "scenarioTags": [],
    "correctAnswer": "High noise levels are contaminating the session, making reads unreliable.",
    "starterRolls": [],
    "prompt": "What does \"Pair Safety: DANGER\" tell you?",
    "lesson": "When the safety is DANGER, the 'Noise' is too high. It's like trying to hear a secret in a loud thunderstorm!",
    "successText": "Correct! DANGER means too many 'Noise' values are appearing. The commons lane is being disrupted, and your predictions are significantly less likely to hit.",
    "mistakeText": "Don't panic! It just means the session is messy. DANGER indicates that outsider rolls are interfering with the expected pattern, making it a bad time to force or bet big."
  },
  {
    "number": 20,
    "chapter": "Svarog Diagnostics",
    "id": "five-minute-window",
    "title": "5-Minute Window",
    "subtitle": "Fresh data keeps the predictor synchronized.",
    "skill": "Diagnostics",
    "voicePath": "companions/Clara/drills-sound/Clara - Q20 Drills guide.mp3",
    "options": [
      "To save memory on your computer.",
      "Because the game's internal random seed can drift over time, making old data less accurate.",
      "To match the time it takes for a relic to 'cool down'."
    ],
    "scenarioTags": [],
    "correctAnswer": "Because the game's internal random seed can drift over time, making old data less accurate.",
    "starterRolls": [],
    "prompt": "Why does Svarog use a \"5-Minute Window\" for predictor data?",
    "lesson": "The game's random seed changes over time. We use a 5-minute window to keep our predictions fresh and accurate!",
    "successText": "Spot on! The game's RNG seed isn't permanent—it drifts. Fresh data from the last 5 minutes is the only way to stay truly synchronized with the game.",
    "mistakeText": "Actually, it's about accuracy. Old data becomes 'stale' because the game's internal RNG state changes over time. We use a 5-minute window to ensure our predictions remain fresh and precise."
  },
  {
    "number": 21,
    "chapter": "Scenario Drills",
    "id": "scenario-running-session",
    "title": "Scenario: Running Session",
    "subtitle": "Follow the dominant value while the streak is hot.",
    "skill": "Scenario Read",
    "voicePath": "companions/Clara/drills-sound/Clara - Q21 Drills guide.mp3",
    "options": [
      "Bet on 41 naturally; the streak is active.",
      "Force to 44 immediately; the streak is about to break.",
      "Wait for the \"Warming Up\" badge to go away.",
      "Force to 41 using the Caesar Shift panel."
    ],
    "scenarioTags": [
      {
        "label": "Predictor Status",
        "value": "🔥 Running"
      }
    ],
    "correctAnswer": "Bet on 41 naturally; the streak is active.",
    "starterRolls": [
      "41",
      "41",
      "41",
      "41",
      "41",
      "41"
    ],
    "prompt": "You just entered three '41's in a row. The predictor shows \"🔥 Running\". You want a 41 to hit your target. What is the correct move?",
    "lesson": "In a 'Running' session, the winner keeps winning! The safest bet is usually to follow the value that is already hot.",
    "successText": "Correct! If the session is 'Running', the safest bet is the dominant value. Ride the streak while it's hot!",
    "mistakeText": "Wait! If it says 'Running', why would you force a break? A running streak means the same number is repeating. Just follow the trend until it stops!"
  },
  {
    "number": 22,
    "chapter": "Scenario Drills",
    "id": "scenario-alternating-session",
    "title": "Scenario: Alternating Session",
    "subtitle": "Read the next step from the flip rhythm.",
    "skill": "Scenario Read",
    "voicePath": "companions/Clara/drills-sound/Clara - Q22 Drills guide.mp3",
    "options": [
      "42 again.",
      "43.",
      "41 (Noise).",
      "44 (Overdue)."
    ],
    "scenarioTags": [
      {
        "label": "Predictor Status",
        "value": "🔄 Alternating"
      }
    ],
    "correctAnswer": "43.",
    "starterRolls": [
      "42",
      "43",
      "42",
      "43",
      "42",
      "43"
    ],
    "prompt": "The session is flip-flopping between 42 and 43. Your last roll was 42. What does Svarog expect next?",
    "lesson": "An 'Alternating' session flips back and forth like a clock. If you know the two partners, you know what's coming next!",
    "successText": "Perfect! You've spotted the rhythm. 42 -> 43 -> 42 -> 43... the next logic step is 43!",
    "mistakeText": "Incorrect. Look at the sequence: 42, 43, 42, 43, 42. It's a binary flip. If the last was 42, the next expectation is the other half of the pair: 43!"
  },
  {
    "number": 23,
    "chapter": "Scenario Drills",
    "id": "scenario-break-danger",
    "title": "Scenario: Break Danger",
    "subtitle": "Do not force during unstable noise.",
    "skill": "Scenario Read",
    "voicePath": "companions/Clara/drills-sound/Clara - Q23 Drills guide.mp3",
    "options": [
      "Yes, (4 - 1 + 4) % 4 = 3 steps. Force it!",
      "No, the session is in Break Danger; forcing is unreliable.",
      "Yes, use 1 technique only.",
      "No, wait for the 5-minute window to clear."
    ],
    "scenarioTags": [
      {
        "label": "Predictor Status",
        "value": "⚠️ Chaotic (65% Noise)"
      },
      {
        "label": "Safety Level",
        "value": "Break Danger (Rose Red)"
      }
    ],
    "correctAnswer": "No, the session is in Break Danger; forcing is unreliable.",
    "starterRolls": [
      "41",
      "41",
      "44",
      "41",
      "41",
      "42",
      "41",
      "41",
      "44"
    ],
    "prompt": "You are on Line 1. Your target stat is on Line 4. Should you use techniques to move to Line 4 right now?",
    "lesson": "Don't try to force a move during 'Break Danger'. The connection is too unstable, and you'll likely miss your target.",
    "successText": "Safety first! In 'Break Danger', the connection between your steps and the results is fragile. Forcing now would likely land you on a noise value instead of your target.",
    "mistakeText": "Stop! While the math says 3 steps, the Safety Level says DANGER. When noise is high, manipulation doesn't work. If you force now, you'll probably miss your target because of a noise break!"
  },
  {
    "number": 24,
    "chapter": "Scenario Drills",
    "id": "scenario-flip-warning",
    "title": "Scenario: Flip Warning",
    "subtitle": "Know when a long streak is about to snap.",
    "skill": "Scenario Read",
    "voicePath": "companions/Clara/drills-sound/Clara - Q24 Drills guide.mp3",
    "options": [
      "Emerald Dominance Lock is starting.",
      "A 'Flip' to the opposite side is statistically imminent.",
      "The predictor is stuck on 44.",
      "You need to add 10 more rolls to see the trend."
    ],
    "scenarioTags": [
      {
        "label": "Wave Indicator",
        "value": "Run Length 5 (Orange)"
      },
      {
        "label": "Flip Probability",
        "value": "82%"
      }
    ],
    "correctAnswer": "A 'Flip' to the opposite side is statistically imminent.",
    "starterRolls": [
      "44",
      "44",
      "44",
      "44",
      "44",
      "44"
    ],
    "prompt": "44 has hit 5 times in a row. The run length has turned Orange. What is about to happen?",
    "lesson": "When a streak gets too long, the 'Tension' builds up. A snap to the other side becomes mathematically imminent!",
    "successText": "Correct! A run of 5 is highly unusual. The orange indicator and 82% probability mean the 'tension' is at maximum — expect a flip on the next readout!",
    "mistakeText": "Incorrect. Orange run length is a warning! It means the streak is 'overextended'. With an 82% flip chance, the pattern is almost guaranteed to snap to a different value next."
  }
];
