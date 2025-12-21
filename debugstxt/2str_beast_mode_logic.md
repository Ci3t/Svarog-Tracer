# 2-Str "Beast Mode" Predictor: Knowledge Synthesis & Requirements

This document captures the evolved understanding of the 2-string prediction system for the HSR Pattern Record, based on the theory in "Notes of the Genius Society" and real-time iterative feedback.

## 1. Core Core Context
*   **Target:** 2-digit "4xxx" strings (translated from raw input via Caesar shift).
*   **Possible Values:** `41`, `42`, `43`, `44`.
*   **Time Window:** Strict **5-minute sessions** (updated from the older 15-minute theory).
*   **Goal:** Maximize hit accuracy by identifying the two "Commons" in current live sessions.

## 2. Theoretical Alignment (Genius Society Notes)
*   **Movement Patterns:** Strings represent RELATIVE movement (e.g., `44` stays on the line, `41` moves +1). 
*   **Translation:** Since user data is already translated to the `4xxx` space, we analyze absolute value sequences (`42, 43, 41...`) because the "shift" is already applied.
*   **Session Start:** Every roll moves you forward in the RNG string; the first roll of a 5m window sets the state.

## 3. The "Virtual 2-Column" Logic (The Breakthrough)
The predictor should mimic the **Kiyo Mode** logic but adapted for digits instead of table columns.

### A. Identification of "Commons"
*   In any given 5m window, there are usually **2 Dominant Values** (The Commons).
*   **Example:** `42` and `43` might appear 70% of the time combined.
*   **Virtual Column A (The Signal):** The top 2 most frequent rolls.
*   **Virtual Column B (The Noise/Flips):** The other 2 less frequent rolls.

### B. Pattern Detection Logic
1.  **Dominance:** If one "Common" roll (e.g., `42`) is significantly more frequent than the other (e.g., >60% of the window), it indicates a **Sticky Session**. Predict the dominant value.
2.  **Alternating (Flips):** If the data shows `42 -> 43 -> 42 -> 43`, predict the flip.
3.  **Run-Based:** Sequences of the same digit (e.g., `42, 42, 42`).
4.  **Noise Handling:** If "Noise" rolls (Column B, e.g., `41, 41`) appear suddenly, act as if it's a "miss" or a "flip" but monitor for a "snap-back" to the primary Commons (`42, 43`).

## 4. Key Q&A Summary

*   **Q:** Should we use Markov transition analysis (e.g., 42 always leads to 43)?
*   **A:** **No.** It depends on the pattern of the specific 5m window. It might be `42 -> 42` (dominance) or `42 -> 43` (alternating).
*   **Q:** What about noise?
*   **A:** Detect if the pattern is changing or just "noise" (e.g., `41` appearing inside a `42/43` session). Treat it like a flip or skip if confidence drops too low.
*   **Q:** Priority of data?
*   **A:** **Live data is primary.** Sheet data is a fallback for early in the session when live data is insufficient.

## 5. Next Steps for Implementation
1.  Map the 4 possible rolls into two virtual columns (Top 2 vs Bottom 2).
2.  Port the state-machine/wave analysis logic from Kiyo Mode to this 2-string digit space.
3.  Implement Chaos detection (Skip recommendation) when distribution is too flat (e.g., 25% for all digits).
