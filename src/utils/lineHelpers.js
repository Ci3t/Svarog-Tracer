// src/utils/lineHelpers.js

/**
 * Caesar-shift a 2-str prediction so its first digit matches the "line"
 * the player is currently on.
 *
 * Example:
 *   prediction = "41"
 *   user line input = "2"  (or "31" → last digit is 1, etc.)
 *   result → "23"
 */
export function shiftPredictionForLine(prediction, lineInput) {
  if (!prediction || !lineInput) return null;

  const cleanPred = String(prediction).replace(/[^1-4]/g, "");
  if (cleanPred.length !== 2) return null;

  // Take ONLY the last digit of whatever the user typed
  const lineDigitChar = String(lineInput)
    .replace(/[^1-4]/g, "")
    .slice(-1);
  if (!lineDigitChar) return null;

  const line = Number(lineDigitChar);
  if (line < 1 || line > 4) return null;

  const digits = cleanPred.split("").map(Number);

  // Shift so that the first digit of the prediction becomes `line`
  // (same style as translateTo4, just with a different anchor).
  const shift = (line - digits[0] + 4) % 4;

  const shifted = digits
    .map((d) => {
      const z = d - 1;
      const s = (z + shift) % 4;
      return (s + 1).toString();
    })
    .join("");

  return shifted;
}
