# 2-Str "Beast Mode" Logic Synthesis

## Core Concept
We are evolving the 2-string predictor to use a **"Virtual 2-Column" System**, inspired by the Kiyo Predictor's logic but adapted for the 4-value space (`41`, `42`, `43`, `44`).

## The "Virtual 2-Column" Model
In any given **5-minute session**, rolls tend to cluster around two dominant values ("Commons").

1.  **Identify Commons (Virtual Column A - The Signal):**
    *   Find the two most frequent 2-digit rolls in the current window (e.g., `42` and `43`).
    *   These represent the "Signal" or the main "Columns".

2.  **Identify Noise (Virtual Column B - The Noise):**
    *   The other two less frequent values (e.g., `41` and `44`) are treated as "Noise" or "Misses".

## Pattern Recognition Logic (The "Beast")

Once we have identified the Commons vs. Noise, we apply Kiyo-style pattern detection:

1.  **🦁 Dominance (Sticky Session):**
    *   **Logic:** Is one of the Commons (e.g., `42`) appearing significantly more often than the other (>60% of the window)?
    *   **Action:** Predict the dominant value (`42`). This aligns with "sticky" RNG sessions.

2.  **🔄 Alternating (Flip Pattern):**
    *   **Logic:** Are the Commons alternating? `42 -> 43 -> 42 -> 43`...
    *   **Action:** Predict the flip. If last was `42`, predict `43`.

3.  **🏃 Run-Based Patterns:**
    *   **Logic:** Are we seeing runs? `42, 42` then `43, 43`...
    *   **Action:** Predict a continuation of the run until it breaks.

4.  **📉 Noise Handling & Recovery:**
    *   **Scenario:** Commons are `42, 43`. Suddenly `41, 41` appears (Noise).
    *   **Action:** Treat noise as a temporary deviation. Watch for a "snap-back" to the Commons. If noise persists, the session might be shifting (re-evaluate Commons).

## Configuration Updates
*   **Time Window:** Strict **5-minute sessions** (replacing older 15m logic).
*   **Data Translation:** Input is already Caesar-shifted to `4xxx` space.
*   **Primary Data Source:** **Live Session Data** (heavily weighted). Sheet data is fallback only.

## Implementation Plan
1.  **Modify `predictNext2Smart`**:
    *   Implement the "Virtual Column" sorting logic (Top 2 vs Bottom 2).
    *   Apply Dominance, Alternating, and Run detection on the Virtual Columns.
    *   Implement "Noise" filtering.
2.  **Chaos Detection:** Explicitly flag "Chaotic" sessions where no clear Commons exist (e.g., ~25% distribution across all 4).

This logic aims to maximize accuracy by filtering out noise and locking onto the underlying 2-value pattern of the current 5-minute RNG seed.
