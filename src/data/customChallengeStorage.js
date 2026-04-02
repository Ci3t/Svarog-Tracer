const CUSTOM_CHALLENGE_STORAGE_KEY = 'svarog_custom_challenge_v1';

export function getCustomChallengeStorageKey() {
  return CUSTOM_CHALLENGE_STORAGE_KEY;
}

export function saveCustomChallengeScenario(scenario) {
  if (typeof window === 'undefined' || !scenario) return false;

  try {
    window.localStorage.setItem(CUSTOM_CHALLENGE_STORAGE_KEY, JSON.stringify(scenario));
    return true;
  } catch {
    return false;
  }
}

export function readCustomChallengeScenario() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(CUSTOM_CHALLENGE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearCustomChallengeScenario() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(CUSTOM_CHALLENGE_STORAGE_KEY);
  } catch {
    // Ignore localStorage failures.
  }
}
