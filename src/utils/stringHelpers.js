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

// keep only 1–4 and enforce min 2 digits, max 4 digits
export function sanitizeRollInput(value = "") {
  const cleaned = value.replace(/[^1-4]/g, "");
  // Cap at 4 digits max
  return cleaned.slice(0, 4);
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
// Caesar decode table: "rowcol" -> actual 2-str roll ("41".."44")
// This inverts the same grid used in DebugPanel long-string builder.
const LONG_CAESAR_DECODE = {
  // Row 1
  11: "44",
  12: "41",
  13: "42",
  14: "43",
  // Row 2
  21: "43",
  22: "44",
  23: "41",
  24: "42",
  // Row 3
  31: "42",
  32: "43",
  33: "44",
  34: "41",
  // Row 4 (pure row – no Caesar shift)
  41: "41",
  42: "42",
  43: "43",
  44: "44",
};

/**
 * Decode a long string like "41242323" into:
 *  - cleaned: only digits 1–4
 *  - pairs: sliding Caesar pairs: ["41","12","24","42","23","32","23"]
 *  - rolls: decoded 2-str rolls: ["41","41","42","42","41","43","41"]
 *
 * Example:
 *   decodeLongString("41242323")
 *   => { cleaned: "41242323",
 *        pairs: ["41","12","24","42","23","32","23"],
 *        rolls: ["41","41","42","42","41","43","41"] }
 */
export function decodeLongString(longStrRaw = "") {
  const digits = String(longStrRaw)
    .split("")
    .map((d) => {
      const n = parseInt(d, 10);
      if (isNaN(n)) return null;
      // ✅ MAP 1–9 → 1–4 USING MODULO (GAME-NATIVE)
      return ((n - 1) % 4) + 1;
    })
    .filter(Boolean)
    .map(String);

  const cleaned = digits.join("");

  if (cleaned.length < 2) {
    return { cleaned, pairs: [], rolls: [] };
  }

  const pairs = [];
  const rolls = [];

  for (let i = 0; i < cleaned.length - 1; i++) {
    const pair = cleaned.slice(i, i + 2);
    pairs.push(pair);

    // ✅ SAME CAESAR DECODE TABLE AS BEFORE
    const roll = LONG_CAESAR_DECODE[pair];
    if (roll) {
      rolls.push(roll);
    }
  }

  return { cleaned, pairs, rolls };
}
