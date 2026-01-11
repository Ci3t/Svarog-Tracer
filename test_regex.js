// Test the regex patterns for WuWa HTML parsing

const testHTML = String.raw`\"histogram\":{\"1\":835,\"2\":755},\"label\":\"5✦ Pulls per Pity\"`;

console.log("Test HTML:", testHTML);
console.log("");

// Current broken pattern (missing closing quote after histogram)
const brokenPattern = /\\"histogram\":\{([^}]+)\}/;
const brokenMatch = testHTML.match(brokenPattern);
console.log("Broken pattern match:", brokenMatch ? "✓ FOUND" : "✗ NOT FOUND");
if (brokenMatch) console.log("  Captured:", brokenMatch[1]);

// Fixed pattern (with closing quote)
const fixedPattern = /\\"histogram\\":\{([^}]+)\}/;
const fixedMatch = testHTML.match(fixedPattern);
console.log("Fixed pattern match:", fixedMatch ? "✓ FOUND" : "✗ NOT FOUND");
if (fixedMatch) console.log("  Captured:", fixedMatch[1]);

// Full pattern with label
const fullPattern = /\\"histogram\\":\{([^}]+)\}[^}]*\\"label\\":\\"5✦ Pulls per Pity\\"/;
const fullMatch = testHTML.match(fullPattern);
console.log("Full pattern match:", fullMatch ? "✓ FOUND" : "✗ NOT FOUND");
if (fullMatch) console.log("  Captured:", fullMatch[1]);
