export const SINGLE_TRAILBLAZER_TEAM_MESSAGE =
  'Only 1 MC is allowed. Remove the current MC before adding another version.';

export function isTrailblazerCharacterRef(value) {
  if (value === null || value === undefined) return false;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('trailblazer-')) return true;

  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 8001 && numeric <= 8008;
}

export function hasMultipleTrailblazers(values) {
  let count = 0;
  for (const value of Array.isArray(values) ? values : []) {
    if (!value) continue;
    if (isTrailblazerCharacterRef(value)) {
      count += 1;
      if (count >= 2) return true;
    }
  }
  return false;
}

export function wouldCreateTrailblazerConflict(values, incomingValue, { ignoreIndex = -1 } = {}) {
  if (!isTrailblazerCharacterRef(incomingValue)) return false;

  return (Array.isArray(values) ? values : []).some((value, index) => {
    if (!value || index === ignoreIndex) return false;
    if (String(value) === String(incomingValue)) return false;
    return isTrailblazerCharacterRef(value);
  });
}
