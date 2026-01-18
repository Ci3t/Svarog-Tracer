/**
 * AI Configuration
 * Centralized config for Gemini API integration
 */

export const AI_CONFIG = {
  // Model Selection
  MODEL: 'gemini-2.5-flash',  // User requested model (Experimental?)
  
  // Generation Parameters
  TEMPERATURE: 0.7,
  MAX_OUTPUT_TOKENS: 200,
  TOP_P: 0.9,
  
  // Rate Limits (Gemini Free Tier - adjust based on actual limits)
  RATE_LIMITS: {
    GLOBAL_PER_MINUTE: 15,
    GLOBAL_PER_DAY: 1500,
    PER_USER_PER_MINUTE: 5,
    PER_USER_PER_DAY: 100
  },
  
  // Gating Rules (Prevent loops/spam)
  GATING: {
    MIN_COOLDOWN_MS: 5000,              // 5 seconds between calls
    MAX_CALLS_PER_SESSION_SHARED: 25,   // Admin key limit
    MAX_CALLS_PER_SESSION_BYOK: 100,    // User key limit
    MIN_HISTORY_LENGTH: 6               // Minimum rolls needed
  },
  
  // Timeouts
  REQUEST_TIMEOUT_MS: 10000,  // 10 second timeout
  
  // Output Validation
  MAX_WHY_LENGTH: 240,
  MAX_DISAGREE_REASON_LENGTH: 240,
  
  // Allowed Prediction Values
  VALID_ROLLS: [41, 42, 43, 44]
}

// Predefined flags for AI responses
export const AI_FLAGS = {
  HIGH_CONFIDENCE: 'high_confidence',
  LOW_CONFIDENCE: 'low_confidence',
  DISAGREES_WITH_ALGO: 'disagrees_with_algo',
  AGREES_WITH_ALGO: 'agrees_with_algo',
  PATTERN_DETECTED: 'pattern_detected',
  INSUFFICIENT_DATA: 'insufficient_data'
}

// Error codes
export const AI_ERROR_CODES = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  TIMEOUT: 'TIMEOUT'
}
