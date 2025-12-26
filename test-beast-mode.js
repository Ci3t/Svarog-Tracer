// test-beast-mode.js
// Quick test script to validate Beast Mode with real trace data

import { predictNext2BeastMode } from './src/utils/beast-mode-2str.js';

// Test Case 1: Your example from the trace (2:25 AM - 2:30 AM)
// Actual sequence: 41 → 42 → 41 → 42 → 44 → 42 → 41 → 42 → 41 → 44 → 42 → 42 → 41
const testCase1 = ["41", "42", "41", "42", "44", "42", "41", "42"];
console.log("=== Test Case 1: Alternating Pattern (42, 41) ===");
const result1 = predictNext2BeastMode(testCase1);
console.log("Commons:", result1.commons);
console.log("Pattern:", result1.pattern);
console.log("Prediction:", result1.prediction);
console.log("Confidence:", result1.confidence.toFixed(2));
console.log("Reasoning:", result1.reasoning);
console.log("Distribution:", result1.distribution);
console.log("");

// Test Case 2: Dominance pattern (44 dominant)
const testCase2 = ["44", "44", "42", "44", "42", "44", "43", "44", "41", "43"];
console.log("=== Test Case 2: Dominance Pattern (44 dominant) ===");
const result2 = predictNext2BeastMode(testCase2);
console.log("Commons:", result2.commons);
console.log("Pattern:", result2.pattern);
console.log("Prediction:", result2.prediction);
console.log("Confidence:", result2.confidence.toFixed(2));
console.log("Reasoning:", result2.reasoning);
console.log("");

// Test Case 3: Run pattern (42 dominant with runs)
const testCase3 = ["42", "41", "42", "44", "42", "44", "41", "42", "42", "42", "42", "42"];
console.log("=== Test Case 3: Run Pattern (42 runs) ===");
const result3 = predictNext2BeastMode(testCase3);
console.log("Commons:", result3.commons);
console.log("Pattern:", result3.pattern);
console.log("Prediction:", result3.prediction);
console.log("Confidence:", result3.confidence.toFixed(2));
console.log("Reasoning:", result3.reasoning);
console.log("");

// Test Case 4: Noise recovery
const testCase4 = ["42", "41", "42", "41", "42", "41", "44", "44"];
console.log("=== Test Case 4: Noise Recovery (44 is noise) ===");
const result4 = predictNext2BeastMode(testCase4);
console.log("Commons:", result4.commons);
console.log("Pattern:", result4.pattern);
console.log("Prediction:", result4.prediction);
console.log("Confidence:", result4.confidence.toFixed(2));
console.log("Reasoning:", result4.reasoning);
console.log("");

// Test Case 5: Chaotic (all values equal)
const testCase5 = ["41", "42", "43", "44", "41", "42", "43", "44"];
console.log("=== Test Case 5: Chaotic (all equal) ===");
const result5 = predictNext2BeastMode(testCase5);
console.log("Commons:", result5.commons);
console.log("Pattern:", result5.pattern);
console.log("Prediction:", result5.prediction);
console.log("Confidence:", result5.confidence.toFixed(2));
console.log("Reasoning:", result5.reasoning);
