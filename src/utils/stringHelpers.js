// src/utils/stringHelpers.js

// shift whole string so it starts with 4 (your caesar-style translate)
export function translateTo4(str = "") {
  if (!str) return "";
  const digits = str.split("").map((d) => parseInt(d, 10));
  // if there's anything not 1..4 -> treat as invalid
  if (digits.some((d) => isNaN(d) || d < 1 || d > 4)) {
    return "";
  }
  const shift = (4 - digits[0] + 4) % 4;
  return digits
    .map((d) => {
      const zero = d - 1;
      const shifted = (zero + shift) % 4;
      return (shifted + 1).toString();
    })
    .join("");
}

// pad with zeros to 5 digits
export function padTo5(str = "") {
  return (str || "").padEnd(5, "0").slice(0, 5);
}

// keep only 1–4
export function sanitizeRollInput(value = "") {
  return value.replace(/[^1-4]/g, "");
}

/**
 * splitString SHOULD NOT pad.
 * It should only return the raw slices.
 * Rendering components will translate + pad.
 */
export function splitString(str = "") {
  const clean = sanitizeRollInput(str.trim());

  return {
    s2: clean.length >= 2 ? clean.slice(0, 2) : clean,
    s3: clean.length >= 3 ? clean.slice(0, 3) : clean,
    s4: clean.length >= 4 ? clean.slice(0, 4) : clean,
    s5: clean.length >= 5 ? clean.slice(0, 5) : clean,
  };
}

// build frequency for panel
export function buildPrefixFreq(
  entries,
  len = 2,
  { translateAll = false } = {}
) {
  const counts = {};
  entries.forEach((row) => {
    // row.s2/s3/s4/s5 are now raw (like "23" or "233")
    let key =
      len === 2 ? row.s2 : len === 3 ? row.s3 : len === 4 ? row.s4 : row.s5;
    if (!key) return;

    if (translateAll) {
      const t = translateTo4(key);
      key = padTo5(t || key); // if translate failed, at least pad raw
    } else {
      key = padTo5(key);
    }

    counts[key] = (counts[key] || 0) + 1;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return Object.entries(counts)
    .map(([pattern, count]) => ({
      pattern,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
