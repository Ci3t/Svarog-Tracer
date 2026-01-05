/**
 * Detect line from raw input string (last digit 1-4)
 */
export function detectLineFromRaw(raw) {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.replace(/[^1-4]/g, "");
  if (!clean) return null;
  const lastDigit = Number(clean[clean.length - 1]);
  return [1, 2, 3, 4].includes(lastDigit) ? lastDigit : null;
}

/**
 * Caesar shift for ANY length string (2-str, 3-str, 4-str)
 * Shifts the prediction so that the first digit becomes `line`.
 */
export function caesarShiftForLine(prediction, line) {
  if (!prediction || !line) return null;

  const cleanPred = String(prediction).replace(/[^1-4]/g, "");
  if (!cleanPred) return null;

  const lineDigit = Number(line);
  if (lineDigit < 1 || lineDigit > 4) return null;

  const digits = cleanPred.split("").map(Number);

  // Shift so that the first digit becomes `line`
  const shift = (lineDigit - digits[0] + 4) % 4;

  const shifted = digits
    .map((d) => {
      const z = d - 1; // 0-3
      const s = (z + shift) % 4; // apply shift
      return (s + 1).toString(); // 1-4
    })
    .join("");

  return shifted;
}
